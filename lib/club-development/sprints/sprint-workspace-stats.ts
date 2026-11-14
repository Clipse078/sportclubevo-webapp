import "server-only";

import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function loadSprintProgressStats(tenantId: string, sprintId: string) {
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: { taskId: true },
  });
  if (memberships.length === 0) {
    return { total: 0, completed: 0 };
  }
  const tasks = await prisma.task.findMany({
    where: { tenantId, id: { in: memberships.map((m) => m.taskId) } },
    select: { status: true },
  });
  const completed = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  return { total: tasks.length, completed };
}