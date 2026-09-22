import { NextRequest, NextResponse } from "next/server";
import { WorkspaceResourceType } from "@prisma/client";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { loadWorkspaceAccessSummaryViewModel } from "@/lib/workspace/access/access-management-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { documentId } = await context.params;
  const id = documentId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Dokument-ID fehlt." }, { status: 400 });
  }

  const summary = await loadWorkspaceAccessSummaryViewModel({
    actor: access.actor,
    resource: { resourceType: WorkspaceResourceType.DOCUMENT, documentId: id },
  });

  if (!summary) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ summary }, { status: 200 });
}
