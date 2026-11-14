import { NextRequest, NextResponse } from "next/server";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import { addTaskToSprint, SprintServiceError } from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { createTask } from "@/lib/tasks/task-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await requireStrategicApiContext([
    PERMISSIONS.INITIATIVES_MANAGE,
    PERMISSIONS.TASKS_MANAGE,
  ]);
  if (!access.ok) return access.response;
  if (!hasSprintManagePermission(access.context.actor)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const sprint = await getDevelopmentSprintById(id, access.context.actor);
  if (!sprint) {
    return NextResponse.json({ error: "Sprint nicht gefunden." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Titel ist erforderlich." }, { status: 400 });
  }

  try {
    const task = await createTask(
      {
        tenantId: access.context.tenantId,
        userId: access.context.actor.userId,
        permissionKeys: access.context.actor.permissionKeys,
      },
      {
        title,
      },
    );

    try {
      await addTaskToSprint(access.context.tenantId, id, task.id);
      return NextResponse.json({ task, sprintAllocated: true });
    } catch (allocateErr) {
      const allocateMessage =
        allocateErr instanceof SprintServiceError
          ? allocateErr.message
          : "Sprint-Zuordnung fehlgeschlagen.";
      return NextResponse.json(
        {
          task,
          sprintAllocated: false,
          allocationError: allocateMessage,
          retryTaskId: task.id,
        },
        { status: 207 },
      );
    }
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}