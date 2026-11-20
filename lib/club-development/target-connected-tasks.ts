import "server-only";

import { TaskContextType, type TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";

export type TargetConnectedTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  href: string;
};

export async function loadTargetConnectedTasks(
  actor: ActorContext,
  targetId: string,
  returnTo: string,
): Promise<TargetConnectedTaskRow[]> {
  const tenantId = actor.tenantId;
  if (!tenantId) return [];

  const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
  if (!taskCtx) return [];

  const rows = await prisma.task.findMany({
    where: {
      tenantId,
      AND: [buildTaskReadWhere(taskCtx)],
      contextType: TaskContextType.TARGET,
      contextId: targetId,
    },
    select: { id: true, title: true, status: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    statusLabel: TASK_STATUS_LABELS[row.status] ?? row.status,
    href: taskWorkspaceHref(row.id, { returnTo }),
  }));
}