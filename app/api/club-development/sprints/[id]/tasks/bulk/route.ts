import { NextRequest, NextResponse } from "next/server";
import {
  getDevelopmentSprintById,
  hasSprintManagePermission,
} from "@/lib/club-development/sprints/queries";
import {
  assertTaskInTenant,
  bulkAddTasksToSprint,
  SprintServiceError,
  type BulkAddTaskRejection,
} from "@/lib/club-development/sprints/sprint-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requireStrategicApiContext } from "@/lib/permissions/require-strategic-api-context";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { requireVisibleTask } from "@/lib/tasks/task-access";
import { TaskForbiddenError, TaskNotFoundError } from "@/lib/tasks/errors";

type RouteContext = { params: Promise<{ id: string }> };

function parseTaskIds(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { taskIds?: unknown }).taskIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

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

  const taskCtx = await buildTaskServiceContextForActor(
    access.context.actorUserId,
    access.context.tenantId,
  );
  if (!taskCtx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const taskIds = parseTaskIds(body);
    if (taskIds.length === 0) {
      return NextResponse.json({ error: "taskIds ist erforderlich." }, { status: 400 });
    }

    const result = await bulkAddTasksToSprint(
      access.context.tenantId,
      id,
      taskIds,
      async (taskId) => {
        try {
          await assertTaskInTenant(access.context.tenantId, taskId);
        } catch {
          return { ok: false, code: "NOT_FOUND" as BulkAddTaskRejection["code"] };
        }
        try {
          const task = await requireVisibleTask(taskCtx, taskId);
          if (task.tenantId !== access.context.tenantId) {
            return { ok: false, code: "WRONG_TENANT" as BulkAddTaskRejection["code"] };
          }
          return { ok: true, status: task.status };
        } catch (err) {
          if (err instanceof TaskForbiddenError) {
            return { ok: false, code: "FORBIDDEN" as BulkAddTaskRejection["code"] };
          }
          if (err instanceof TaskNotFoundError) {
            return { ok: false, code: "NOT_FOUND" as BulkAddTaskRejection["code"] };
          }
          throw err;
        }
      },
    );

    if (result.addedCount === 0 && result.rejected.length > 0) {
      return NextResponse.json(
        {
          error: "Keine Aufgabe konnte hinzugefügt werden.",
          rejected: result.rejected,
          partial: false,
          addedCount: 0,
        },
        { status: 409 },
      );
    }

    if (result.partial) {
      return NextResponse.json(
        {
          error: `${result.addedCount} Aufgabe(n) hinzugefügt, ${result.rejected.length} konnten nicht übernommen werden.`,
          addedCount: result.addedCount,
          addedTaskIds: result.addedTaskIds,
          rejected: result.rejected,
          partial: true,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({
      addedCount: result.addedCount,
      addedTaskIds: result.addedTaskIds,
      rejected: result.rejected,
      partial: false,
    });
  } catch (err) {
    if (err instanceof SprintServiceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}