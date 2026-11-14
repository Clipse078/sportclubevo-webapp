import "server-only";

import { TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type SprintBoardColumnKey = "OPEN" | "IN_PROGRESS" | "DONE";

export type SprintBoardCard = {
  taskId: string;
  title: string;
  status: TaskStatus;
  column: SprintBoardColumnKey;
  priority: string;
  dueAt: string | null;
  assignees: { userId: string; displayName: string }[];
  initiativeLabel: string | null;
  initiativeId: string | null;
  addedAfterSprintStart: boolean;
};

export function mapTaskStatusToBoardColumn(status: TaskStatus): SprintBoardColumnKey {
  if (status === TaskStatus.DONE) return "DONE";
  if (status === TaskStatus.IN_PROGRESS) return "IN_PROGRESS";
  return "OPEN";
}

export async function loadSprintBoard(tenantId: string, sprintId: string) {
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: { taskId: true, addedAfterSprintStart: true },
  });
  if (memberships.length === 0) {
    return { columns: { OPEN: [], IN_PROGRESS: [], DONE: [] } as Record<SprintBoardColumnKey, SprintBoardCard[]> };
  }

  const taskIds = memberships.map((m) => m.taskId);
  const addedFlagByTask = new Map(memberships.map((m) => [m.taskId, m.addedAfterSprintStart]));

  const tasks = await prisma.task.findMany({
    where: { tenantId, id: { in: taskIds } },
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
          userId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const initiativeIds = [
    ...new Set([
      ...tasks
        .filter((t) => t.contextType === TaskContextType.INITIATIVE && t.contextId)
        .map((t) => t.contextId!),
      ...tasks.map((t) => t.primaryInitiativeId).filter((id): id is string => Boolean(id)),
    ]),
  ];

  const initiatives =
    initiativeIds.length > 0
      ? await prisma.initiative.findMany({
          where: { tenantId, id: { in: initiativeIds } },
          select: { id: true, title: true },
        })
      : [];
  const initiativeById = new Map(initiatives.map((i) => [i.id, i]));

  const columns: Record<SprintBoardColumnKey, SprintBoardCard[]> = {
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  };

  for (const task of tasks) {
    const column = mapTaskStatusToBoardColumn(task.status);
    const initiativeIdForLabel =
      task.contextType === TaskContextType.INITIATIVE && task.contextId
        ? task.contextId
        : task.primaryInitiativeId;
    const initiative = initiativeIdForLabel ? initiativeById.get(initiativeIdForLabel) : null;

    const card: SprintBoardCard = {
      taskId: task.id,
      title: task.title,
      status: task.status,
      column,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString() ?? null,
      assignees: task.assignees.map((a) => ({
        userId: a.userId,
        displayName: `${a.user.firstName} ${a.user.lastName}`.trim(),
      })),
      initiativeLabel: initiative?.title ?? null,
      initiativeId: initiativeIdForLabel ?? null,
      addedAfterSprintStart: addedFlagByTask.get(task.id) ?? false,
    };
    columns[column].push(card);
  }

  for (const key of Object.keys(columns) as SprintBoardColumnKey[]) {
    columns[key].sort((a, b) => a.title.localeCompare(b.title, "de"));
  }

  return { columns };
}
