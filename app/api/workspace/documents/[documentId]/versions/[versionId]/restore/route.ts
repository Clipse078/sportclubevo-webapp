export const runtime = "nodejs";

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  restoreWorkspaceDocumentVersion,
  WorkspaceDocumentVersionWriteError,
} from "@/lib/workspace/document-version-write-service";

type RouteContext = {
  params: Promise<{
    documentId: string;
    versionId: string;
  }>;
};

function mapVersionRestoreError(
  error: WorkspaceDocumentVersionWriteError,
): number {
  switch (error.code) {
    case "INVALID_INPUT":
      return 400;
    case "DOCUMENT_NOT_FOUND":
    case "VERSION_NOT_FOUND":
    case "VERSION_NOT_IN_DOCUMENT":
    case "VERSION_CONTENT_UNAVAILABLE":
      return 404;
    case "VERSION_CONFLICT":
      return 409;
    case "STORAGE_FAILURE":
      return 502;
    default:
      return 500;
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_VIEW,
  );

  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const tenant = await getTenantFromSession(access.tenantId);

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant nicht gefunden." },
      { status: 404 },
    );
  }

  const { documentId, versionId: sourceVersionId } =
    await context.params;

  try {
    assertWorkspaceDocumentEdit(access.actor, documentId);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden.", code: "VERSION_RESTORE_FORBIDDEN" },
        { status: 404 },
      );
    }
    throw error;
  }

  let changeNote: string | null = null;

  try {
    const body = (await request.json()) as { changeNote?: unknown };
    if (typeof body.changeNote === "string") {
      changeNote = body.changeNote.trim() || null;
    }
  } catch {
    changeNote = null;
  }

  const newVersionId = randomUUID().replaceAll("-", "");

  try {
    const document = await restoreWorkspaceDocumentVersion({
      tenantId: tenant.id,
      actorUserId: access.actorUserId,
      documentId,
      sourceVersionId,
      newVersionId,
      changeNote,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    if (error instanceof WorkspaceDocumentVersionWriteError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: mapVersionRestoreError(error) },
      );
    }

    console.error(
      "[workspace-documents] version restore failed",
      error,
    );

    return NextResponse.json(
      { error: "Die Version konnte nicht wiederhergestellt werden." },
      { status: 500 },
    );
  }
}
