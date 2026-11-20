import "server-only";

import { type TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { computeTargetDeliveryProgress } from "./vereinsentwicklung-workspace-progress";

export type TargetConnectedTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  statusLabel: string;
  responsibleLabel: string | null;
  href: string;
};

export async function loadTargetConnectedTasks(
  actor: ActorContext,
  targetId: string,
  returnTo: string,
): Promise<TargetConnectedTaskRow[]> {
  const tenantId = actor.tenantId;
  if (!tenantId) return [];

  const delivery = await computeTargetDeliveryProgress(actor, targetId);
  const taskIds = delivery.contributingTaskIds;
  if (taskIds.length === 0) return [];

  const rows = await prisma.task.findMany({
    where: { tenantId, id: { in: taskIds } },
    select: {
      id: true,
      title: true,
      status: true,
      assignees: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const byId = new Map(rows.map((row) => [row.id, row]));

  return taskIds
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => {
      const assignee = row.assignees[0];
      const responsibleLabel = assignee
        ? `${assignee.user.firstName} ${assignee.user.lastName}`.trim() || null
        : null;
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        statusLabel: TASK_STATUS_LABELS[row.status] ?? row.status,
        responsibleLabel,
        href: taskWorkspaceHref(row.id, { returnTo }),
      };
    });
}