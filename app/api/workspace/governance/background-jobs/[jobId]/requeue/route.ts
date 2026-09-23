import { NextResponse } from "next/server";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  manuallyRequeueDeadWorkspaceBackgroundJob,
  WorkspaceBackgroundJobRequeueError,
} from "@/lib/workspace/background-jobs/manual-requeue-service";
import { requireWorkspaceApiActor } from "@/lib/workspace/workspace-api-actor";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireWorkspaceApiActor(
    PERMISSIONS.WORKSPACE_GOVERNANCE_MANAGE,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { jobId } = await context.params;

  try {
    const result = await manuallyRequeueDeadWorkspaceBackgroundJob({
      tenantId: access.tenantId,
      jobId: jobId.trim(),
      actorUserId: access.actorUserId,
      permissionKeys: access.actor.permissionKeys,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WorkspaceBackgroundJobRequeueError) {
      const status =
        err.code === "FORBIDDEN"
          ? 403
          : err.code === "NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
