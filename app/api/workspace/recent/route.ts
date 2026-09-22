import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";
import { listWorkspaceRecent } from "@/lib/workspace/collaboration/recent-service";

export async function GET() {
  const access = await requireWorkspaceApiActor(PERMISSIONS.WORKSPACE_VIEW);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const recent = await listWorkspaceRecent({
    tenantId: access.tenantId,
    userId: access.actorUserId,
    actor: access.actor,
  });

  return NextResponse.json({ recent });
}
