import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { getDevelopmentSprintById } from "@/lib/club-development/sprints/queries";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { updateTask } from "@/lib/tasks/task-service";
import { TaskForbiddenError } from "@/lib/tasks/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { prisma } from "@/lib/db/prisma";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_VIEW,
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;

  const { id, taskId } = await params;
  const sprint = await getDevelopmentSprintById(id, access.context.actor);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }

  const membership = await prisma.developmentSprintTaskMembership.findFirst({
    where: {
      tenantId: access.context.tenantId,
      sprintId: id,
      taskId,
      removedAt: null,
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Aufgabe ist nicht im Sprint." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status as TaskStatus | undefined;
  if (!status || !Object.values(TaskStatus).includes(status)) {
    return NextResponse.json({ error: "Ungültiger status." }, { status: 400 });
  }

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const task = await updateTask(taskCtx, taskId, { status });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof TaskForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
