import "server-only";

import { TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { loadTaskContextLabelBundles } from "@/lib/club-development/vereinsentwicklung-task-context-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import { mapTaskAssigneeRowsToViewModels, type SprintTaskAssigneeViewModel } from "./sprint-task-assignee";
import { taskIdsPassingReadWhere } from "./sprint-task-visibility";
import { loadTaskChildRollupProgressMap } from "@/lib/club-development/task-child-rollup-progress";
import { scePublicReferenceFromNumber } from "@/lib/club-development/sce-public-reference";
import {
  mapTaskStatusToVereinsentwicklungBoardColumn,
  type VereinsentwicklungTaskBoardColumn,
} from "../vereinsentwicklung-task-status";

export type { SprintTaskAssigneeViewModel } from "./sprint-task-assignee";

export type SprintBoardColumnKey = VereinsentwicklungTaskBoardColumn;

export type SprintBoardCard = {
  taskId: string;
  publicReference: string | null;
  title: string;
  status: TaskStatus;
  column: SprintBoardColumnKey;
  priority: string;
  dueAt: string | null;
  assignees: SprintTaskAssigneeViewModel[];
  initiativeLabel: string | null;
  initiativeId: string | null;
  targetId: string | null;
  targetTitle: string | null;
  strategyId: string | null;
  strategyTitle: string | null;
  orgUnitLabel: string | null;
  taskHref: string;
  addedAfterSprintStart: boolean;
  progressHasChildRollup?: boolean;
  progressCompletedCount?: number | null;
  progressTotalCount?: number | null;
};

export function mapTaskStatusToBoardColumn(status: TaskStatus): SprintBoardColumnKey {
  return mapTaskStatusToVereinsentwicklungBoardColumn(status);
}

export async function loadSprintBoard(
  taskCtx: TaskServiceContext,
  sprintId: string,
) {
  const tenantId = taskCtx.tenantId;
  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: { taskId: true, addedAfterSprintStart: true },
  });
  if (memberships.length === 0) {
    return {
      columns: { OPEN: [], IN_PROGRESS: [], WAITING: [], DONE: [] } as Record<
        SprintBoardColumnKey,
        SprintBoardCard[]
      >,
    };
  }

  const taskIds = memberships.map((m) => m.taskId);
  const addedFlagByTask = new Map(memberships.map((m) => [m.taskId, m.addedAfterSprintStart]));

  const tasks = await prisma.task.findMany({
    where: taskIdsPassingReadWhere(taskCtx, { id: { in: taskIds } }),
    select: {
      id: true,
      scePublicNumber: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      contextType: true,
      contextId: true,
      primaryInitiativeId: true,
      orgUnitId: true,
      assignees: {
        orderBy: { assignedAt: "asc" },
        select: { userId: true },
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
    WAITING: [],
    DONE: [],
  };

  const allAssigneeUserIds = tasks.flatMap((t) => t.assignees.map((a) => a.userId));
  const assigneeViewByUserId = new Map(
    (await mapTaskAssigneeRowsToViewModels(tenantId, allAssigneeUserIds.map((userId) => ({ userId })))).map(
      (a) => [a.userId, a] as const,
    ),
  );

  const contextLabels = await loadTaskContextLabelBundles(tenantId, tasks);
  const childProgressMap = await loadTaskChildRollupProgressMap(
    taskCtx,
    tasks.map((t) => t.id),
  );

  for (const task of tasks) {
    const column = mapTaskStatusToBoardColumn(task.status);
    const initiativeIdForLabel =
      task.contextType === TaskContextType.INITIATIVE && task.contextId
        ? task.contextId
        : task.primaryInitiativeId;
    const initiative = initiativeIdForLabel ? initiativeById.get(initiativeIdForLabel) : null;
    const labels = contextLabels.get(task.id);

    const rollup = childProgressMap.get(task.id);
    const card: SprintBoardCard = {
      taskId: task.id,
      publicReference: scePublicReferenceFromNumber(task.scePublicNumber),
      title: task.title,
      status: task.status,
      column,
      priority: task.priority,
      dueAt: task.dueAt?.toISOString() ?? null,
      assignees: task.assignees
        .map((a) => assigneeViewByUserId.get(a.userId))
        .filter((a): a is SprintTaskAssigneeViewModel => Boolean(a)),
      initiativeLabel: initiative?.title ?? null,
      initiativeId: initiativeIdForLabel ?? null,
      targetId: labels?.targetId ?? null,
      targetTitle: labels?.targetTitle ?? null,
      strategyId: labels?.strategyId ?? null,
      strategyTitle: labels?.strategyTitle ?? null,
      orgUnitLabel: labels?.orgUnitLabel ?? null,
      taskHref: taskWorkspaceHref(task.id),
      addedAfterSprintStart: addedFlagByTask.get(task.id) ?? false,
      ...(rollup?.hasChildRollup
        ? {
            progressHasChildRollup: true,
            progressCompletedCount: rollup.completedCount,
            progressTotalCount: rollup.totalCount,
          }
        : {}),
    };
    columns[column].push(card);
  }

  for (const key of Object.keys(columns) as SprintBoardColumnKey[]) {
    columns[key].sort((a, b) => a.title.localeCompare(b.title, "de"));
  }

  return { columns };
}
