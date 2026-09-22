import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import { computeAuthorizedReadableResourceIds } from "@/lib/workspace/access/workspace-authorization";
import {
  getArchivedWorkspaceDocuments,
  getArchivedWorkspaceFolders,
} from "@/lib/workspace/queries";

export async function GET() {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const readable = computeAuthorizedReadableResourceIds(access.actor);

  const [folders, documents] = await Promise.all([
    getArchivedWorkspaceFolders(access.tenantId, readable.folderIds),
    getArchivedWorkspaceDocuments(access.tenantId, readable.documentIds),
  ]);

  return NextResponse.json({ folders, documents });
}
