import "server-only";

import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { taskIdsPassingReadWhere } from "./sprint-task-visibility";

export async function loadSprintProgressStats(
  taskCtx: TaskServiceContext,
  sprintId: string,
) {
  const tenantId = taskCtx.tenantId;
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: { taskId: true },
  });
  if (memberships.length === 0) {
    return { total: 0, completed: 0 };
  }
  const tasks = await prisma.task.findMany({
    where: taskIdsPassingReadWhere(taskCtx, { id: { in: memberships.map((m) => m.taskId) } }),
    select: { status: true },
  });
  const completed = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  return { total: tasks.length, completed };
}