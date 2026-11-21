import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import {
  patchVereinsentwicklungTaskStatus,
  VereinsentwicklungTaskStatusMutationError,
} from "@/lib/club-development/vereinsentwicklung-task-status-mutation";

type RouteContext = { params: Promise<{ taskId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { taskId } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status as TaskStatus | undefined;
  const currentStatus = body?.currentStatus as TaskStatus | undefined;

  if (!status || !Object.values(TaskStatus).includes(status)) {
    return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const task = await patchVereinsentwicklungTaskStatus(
      taskCtx,
      taskId,
      status,
      currentStatus,
    );
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof VereinsentwicklungTaskStatusMutationError) {
      const statusCode =
        err.code === "FORBIDDEN" ? 403 : err.code === "INVALID_STATUS" ? 400 : 400;
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusCode });
    }
    throw err;
  }
}