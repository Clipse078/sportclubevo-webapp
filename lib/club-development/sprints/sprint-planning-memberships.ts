import "server-only";

import { TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { listActiveSprintMemberships } from "./sprint-service";
import { resolveReadableSprintTaskIds } from "./sprint-task-visibility";

export type SprintPlanningMembershipRow = {
  membershipId: string;
  taskId: string;
  title: string;
  statusLabel: string;
  status: TaskStatus;
  assigneeLabels: string[];
  initiativeTitle: string | null;
  priorityLabel: string | null;
  dueLabel: string | null;
  addedAfterSprintStart: boolean;
};

const DATE_FMT = new Intl.DateTimeFormat("de-CH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export async function loadAuthorizedSprintPlanningMemberships(
  taskCtx: TaskServiceContext,
  tenantId: string,
  sprintId: string,
): Promise<SprintPlanningMembershipRow[]> {
  const memberships = await listActiveSprintMemberships(tenantId, sprintId);
  if (memberships.length === 0) return [];

  const readableIds = await resolveReadableSprintTaskIds(
    taskCtx,
    memberships.map((m) => m.taskId),
  );
  const visibleMemberships = memberships.filter((m) => readableIds.has(m.taskId));
  if (visibleMemberships.length === 0) return [];

  const tasks = await prisma.task.findMany({
    where: { tenantId, id: { in: [...readableIds] } },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      contextType: true,
      contextId: true,
      primaryInitiativeId: true,
      assignees: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const initiativeIds = [
    ...new Set(
      tasks.flatMap((t) => {
        const ids: string[] = [];
        if (t.contextType === TaskContextType.INITIATIVE && t.contextId) ids.push(t.contextId);
        if (t.primaryInitiativeId) ids.push(t.primaryInitiativeId);
        return ids;
      }),
    ),
  ];
  const initiatives =
    initiativeIds.length > 0
      ? await prisma.initiative.findMany({
          where: { tenantId, id: { in: initiativeIds } },
          select: { id: true, title: true },
        })
      : [];
  const initiativeTitleById = new Map(initiatives.map((i) => [i.id, i.title]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  return visibleMemberships.map((m) => {
    const task = taskById.get(m.taskId);
    const initiativeId =
      task?.contextType === TaskContextType.INITIATIVE && task.contextId
        ? task.contextId
        : task?.primaryInitiativeId ?? null;
    return {
      membershipId: m.id,
      taskId: m.taskId,
      title: task?.title ?? "Aufgabe",
      statusLabel: task ? TASK_STATUS_LABELS[task.status] : "Offen",
      status: task?.status ?? TaskStatus.OPEN,
      assigneeLabels: (task?.assignees ?? [])
        .map((a) => `${a.user.firstName} ${a.user.lastName}`.trim())
        .filter(Boolean),
      initiativeTitle: initiativeId ? initiativeTitleById.get(initiativeId) ?? null : null,
      priorityLabel: task?.priority ?? null,
      dueLabel: task?.dueAt ? DATE_FMT.format(task.dueAt) : null,
      addedAfterSprintStart: m.addedAfterSprintStart,
    };
  });
}