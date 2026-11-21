import "server-only";

import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";
import {
  collectEligibleProgressLeafUnits,
  computeInitiativeProgressFromUnits,
  computeParentTaskProgress,
} from "@/lib/tasks/task-hierarchy-progress";

export type TaskChildRollupProgress = {
  hasChildRollup: boolean;
  completedCount: number | null;
  totalCount: number | null;
};

export async function loadTaskChildRollupProgressMap(
  taskCtx: TaskServiceContext,
  parentTaskIds: readonly string[],
): Promise<Map<string, TaskChildRollupProgress>> {
  const map = new Map<string, TaskChildRollupProgress>();
  const uniqueIds = [...new Set(parentTaskIds.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  const readWhere = buildTaskReadWhere(taskCtx);
  const parents = await prisma.task.findMany({
    where: { tenantId: taskCtx.tenantId, id: { in: uniqueIds } },
    select: { id: true, status: true },
  });
  const parentStatusById = new Map(parents.map((p) => [p.id, p.status]));

  const children = await prisma.task.findMany({
    where: {
      AND: [readWhere, { parentTaskId: { in: uniqueIds } }],
    },
    select: { parentTaskId: true, status: true },
  });

  const subtasksByParent = new Map<string, { status: TaskStatus }[]>();
  for (const child of children) {
    if (!child.parentTaskId) continue;
    const list = subtasksByParent.get(child.parentTaskId) ?? [];
    list.push({ status: child.status });
    subtasksByParent.set(child.parentTaskId, list);
  }

  for (const parentId of uniqueIds) {
    const rolled = computeParentTaskProgress({
      parentStatus: parentStatusById.get(parentId) ?? TaskStatus.OPEN,
      subtasks: subtasksByParent.get(parentId) ?? [],
    });
    if (rolled.hasSubtasks && rolled.totalCount > 0) {
      map.set(parentId, {
        hasChildRollup: true,
        completedCount: rolled.completedCount,
        totalCount: rolled.totalCount,
      });
    } else {
      map.set(parentId, { hasChildRollup: false, completedCount: null, totalCount: null });
    }
  }

  return map;
}

/** Aggregate eligible leaf progress across root tasks (and their visible children). */
export async function computeGroupDeliveryProgressFromRootTaskIds(
  taskCtx: TaskServiceContext,
  rootTaskIds: readonly string[],
): Promise<{ completedCount: number; totalCount: number }> {
  const uniqueRoots = [...new Set(rootTaskIds.filter(Boolean))];
  if (uniqueRoots.length === 0) {
    return { completedCount: 0, totalCount: 0 };
  }

  const readWhere = buildTaskReadWhere(taskCtx);
  const roots = await prisma.task.findMany({
    where: { AND: [readWhere, { id: { in: uniqueRoots } }] },
    select: { id: true, status: true, parentTaskId: true },
  });
  const children = await prisma.task.findMany({
    where: { AND: [readWhere, { parentTaskId: { in: uniqueRoots } }] },
    select: { id: true, status: true, parentTaskId: true },
  });

  const units = collectEligibleProgressLeafUnits([...roots, ...children]);
  const rollup = computeInitiativeProgressFromUnits(units);
  return { completedCount: rollup.completedCount, totalCount: rollup.totalCount };
}