import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  archiveWorkspaceDocument,
  WorkspaceDocumentArchiveServiceError,
} from "@/lib/workspace/document-archive-service";

type Params = {
  params: Promise<{
    documentId: string;
  }>;
};

function mapArchiveServiceError(
  error: WorkspaceDocumentArchiveServiceError,
): number {
  switch (error.code) {
    case "INVALID_INPUT":
      return 400;

    case "DOCUMENT_NOT_FOUND":
      return 404;

    case "TENANT_FORBIDDEN":
      return 403;

    case "DOCUMENT_ALREADY_ARCHIVED":
      return 409;
  }
}

export async function POST(
  _request: Request,
  { params }: Params,
) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_MANAGE,
  );

  if (!access.ok) {
    return NextResponse.json(
      {
        error: access.error,
      },
      {
        status: access.status,
      },
    );
  }

  const sessionTenantId = access.tenantId;
  const actorUserId = access.actorUserId;

  const tenant = await getTenantFromSession(
    sessionTenantId,
  );

  if (!tenant) {
    return NextResponse.json(
      {
        error: "Tenant nicht gefunden.",
      },
      {
        status: 404,
      },
    );
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

  try {
    await archiveWorkspaceDocument({
      tenantId: tenant.id,
      actorUserId,
      documentId,
    });

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    if (
      error instanceof
      WorkspaceDocumentArchiveServiceError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        {
          status: mapArchiveServiceError(error),
        },
      );
    }

    console.error(
      "[workspace-documents] document archive failed",
      error,
    );

    return NextResponse.json(
      {
        error: "Das Dokument konnte nicht archiviert werden.",
      },
      {
        status: 500,
      },
    );
  }
}
