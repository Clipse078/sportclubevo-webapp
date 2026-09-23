import { NextRequest, NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  renameWorkspaceDocument,
  WorkspaceDocumentRenameServiceError,
} from "@/lib/workspace/document-rename-service";

type Params = { params: Promise<{ documentId: string }> };

function mapRenameError(error: WorkspaceDocumentRenameServiceError): number {
  switch (error.code) {
    case "INVALID_INPUT":
    case "DUPLICATE_DOCUMENT_NAME":
      return 400;
    case "DOCUMENT_NOT_FOUND":
      return 404;
    case "TENANT_FORBIDDEN":
      return 403;
    case "INVALID_LIFECYCLE_STATE":
      return 409;
    default:
      return 500;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status },
    );
  }

  const tenant = await getTenantFromSession(access.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant nicht gefunden." }, { status: 404 });
  }

  const { documentId } = await params;

  try {
    assertWorkspaceDocumentEdit(access.actor, documentId);
  } catch (error) {
    if (error instanceof WorkspaceAuthorizationError) {
      return NextResponse.json(
        { error: "Dokument nicht gefunden.", code: "DOCUMENT_NOT_FOUND" },
        { status: 404 },
      );
    }
    throw error;
  }

  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";

  try {
    const result = await renameWorkspaceDocument({
      tenantId: tenant.id,
      actorUserId: access.actorUserId,
      documentId,
      name,
    });
    return NextResponse.json({ success: true, document: result });
  } catch (error) {
    if (error instanceof WorkspaceDocumentRenameServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: mapRenameError(error) },
      );
    }
    throw error;
  }
}
