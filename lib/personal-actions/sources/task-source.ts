import { PERMISSIONS } from "@/lib/permissions/permissions";
import { taskWorkspaceHref } from "@/lib/notifications/deduplication";
import { listMyTasks, countMyOpenTasks } from "@/lib/tasks/task-service";
import { hasTaskPermission } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { buildTaskPersonalActionId } from "../identity";
import type { PersonalAction } from "../types";
import type { PersonalActionSourceAdapter, PersonalActionSourceContext } from "./types";

function toTaskContext(ctx: PersonalActionSourceContext): TaskServiceContext {
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    permissionKeys: ctx.permissionKeys,
  };
}

function mapTaskToPersonalAction(task: Awaited<ReturnType<typeof listMyTasks>>[number]): PersonalAction {
  return {
    id: buildTaskPersonalActionId(task.id),
    sourceType: "TASK",
    sourceId: task.id,
    title: task.title,
    subtitle: task.parentTask?.title ?? null,
    dueAt: task.dueAt,
    status: "ACTIONABLE",
    href: taskWorkspaceHref(task.id),
    actionKind: "TASK",
    createdAt: task.createdAt,
    priority: task.priority,
  };
}

export const taskPersonalActionSource: PersonalActionSourceAdapter = {
  sourceType: "TASK",

  async loadActionable(ctx: PersonalActionSourceContext): Promise<PersonalAction[]> {
    const taskCtx = toTaskContext(ctx);
    if (!hasTaskPermission(taskCtx, PERMISSIONS.TASKS_VIEW)) {
      return [];
    }

    const tasks = await listMyTasks(taskCtx, { openOnly: true });
    return tasks.map(mapTaskToPersonalAction);
  },

  async countActionable(ctx: PersonalActionSourceContext): Promise<number> {
    const taskCtx = toTaskContext(ctx);
    if (!hasTaskPermission(taskCtx, PERMISSIONS.TASKS_VIEW)) {
      return 0;
    }
    return countMyOpenTasks(taskCtx);
  },
};
