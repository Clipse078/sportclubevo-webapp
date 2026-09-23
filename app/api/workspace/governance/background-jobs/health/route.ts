import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getWorkspaceBackgroundJobQueueHealth } from "@/lib/workspace/background-jobs/job-observability";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

export async function GET() {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const health = await getWorkspaceBackgroundJobQueueHealth(access.tenantId);

  return NextResponse.json({ health });
}
