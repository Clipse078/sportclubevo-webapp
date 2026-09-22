import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getTenantFromSession } from "@/lib/tenants/queries";
import { WorkspaceAuthorizationError } from "@/lib/workspace/access/workspace-authorization";
import { assertWorkspaceDocumentEdit } from "@/lib/workspace/workspace-resource-guards";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import {
  trashWorkspaceDocument,
  WorkspaceDocumentTrashServiceError,
} from "@/lib/workspace/lifecycle/document-trash-service";

type Params = { params: Promise<{ documentId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_MANAGE);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
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

  try {
    const result = await trashWorkspaceDocument({
      tenantId: tenant.id,
      actorUserId: access.actorUserId,
      documentId,
    });
    return NextResponse.json({ success: true, trashedAt: result.trashedAt });
  } catch (error) {
    if (error instanceof WorkspaceDocumentTrashServiceError) {
      const status =
        error.code === "DOCUMENT_NOT_FOUND" || error.code === "TENANT_FORBIDDEN"
          ? 404
          : 409;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    throw error;
  }
}
