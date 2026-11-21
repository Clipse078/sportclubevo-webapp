/**
 * Shared Vereinsentwicklung delivery progress rollup (task-leaf rules, deduped by Task ID).
 */

import "server-only";

import { TargetStatus, TaskContextType, TaskStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter } from "@/lib/visibility/visibility-filter";
import {
  collectEligibleProgressLeafUnits,
  computeInitiativeProgressFromUnits,
  isProgressEligibleStatus,
} from "@/lib/tasks/task-hierarchy-progress";
import {
  dedupeTasksById,
  initiativeTaskAssociationOrFilters,
} from "./initiative-associated-tasks";
import { listTargetInitiativeLinks } from "./initiative-target-links";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { buildTaskServiceContextForActor } from "@/lib/tasks/server-context";

export type VereinsentwicklungProgressSnapshot = {
  completedCount: number;
  totalCount: number;
  percent: number;
  contributingTaskIds: string[];
};

const TASK_PROGRESS_SELECT = {
  id: true,
  status: true,
  parentTaskId: true,
} as const satisfies Prisma.TaskSelect;

type ProgressTaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_PROGRESS_SELECT }>;

function snapshotFromUnits(units: { id: string; status: TaskStatus }[]): VereinsentwicklungProgressSnapshot {
  const rollup = computeInitiativeProgressFromUnits(units);
  return {
    completedCount: rollup.completedCount,
    totalCount: rollup.totalCount,
    percent: rollup.percent,
    contributingTaskIds: units.filter((u) => isProgressEligibleStatus(u.status)).map((u) => u.id),
  };
}

async function loadTasksForRollup(
  tenantId: string,
  taskWhere: Prisma.TaskWhereInput,
): Promise<ProgressTaskRow[]> {
  const rows = await prisma.task.findMany({
    where: { tenantId, ...taskWhere },
    select: TASK_PROGRESS_SELECT,
    take: 2000,
  });
  return dedupeTasksById(rows);
}

/**
 * Roll up eligible task leaves for one Ziel (direct TARGET context + tasks via linked Vorhaben).
 */
export async function computeTargetDeliveryProgress(
  actor: ActorContext,
  targetId: string,
): Promise<VereinsentwicklungProgressSnapshot> {
  const tenantId = actor.tenantId;
  if (!tenantId) return { completedCount: 0, totalCount: 0, percent: 0, contributingTaskIds: [] };

  const taskCtx = await buildTaskServiceContextForActor(actor.userId, tenantId);
  if (!taskCtx) return { completedCount: 0, totalCount: 0, percent: 0, contributingTaskIds: [] };

  const readWhere = buildTaskReadWhere(taskCtx);
  const directTarget = await loadTasksForRollup(tenantId, {
    AND: [readWhere],
    OR: [{ contextType: "TARGET" as TaskContextType, contextId: targetId }],
  });

  const links = await listTargetInitiativeLinks(tenantId, targetId);
  const initiativeIds = links.map((l) => l.initiativeId);
  const viaInitiative: ProgressTaskRow[] = [];
  for (const initiativeId of initiativeIds) {
    const chunk = await loadTasksForRollup(tenantId, {
      AND: [readWhere],
      OR: initiativeTaskAssociationOrFilters(initiativeId),
    });
    viaInitiative.push(...chunk);
  }

  const merged = dedupeTasksById([...directTarget, ...viaInitiative]);
  const units = collectEligibleProgressLeafUnits(merged);
  return snapshotFromUnits(units);
}

/**
 * Strategy progress = aggregate of focus target rollups (deduped tasks across Ziele).
 */
export async function computeStrategyDeliveryProgress(
  actor: ActorContext,
  targetIds: readonly string[],
): Promise<VereinsentwicklungProgressSnapshot> {
  const unitMap = new Map<string, TaskStatus>();
  for (const targetId of targetIds) {
    const snap = await computeTargetDeliveryProgress(actor, targetId);
    const rows = await prisma.task.findMany({
      where: { id: { in: snap.contributingTaskIds } },
      select: TASK_PROGRESS_SELECT,
    });
    const units = collectEligibleProgressLeafUnits(rows);
    for (const u of units) unitMap.set(u.id, u.status);
  }
  return snapshotFromUnits(
    [...unitMap.entries()].map(([id, status]) => ({ id, status })),
  );
}

export function formatProgressCountLabel(snapshot: VereinsentwicklungProgressSnapshot): string {
  if (snapshot.totalCount === 0) return "Noch keine Aufgaben";
  return `${snapshot.completedCount} von ${snapshot.totalCount} Aufgaben erledigt`;
}

const TARGET_VISIBILITY_SELECT = {
  id: true,
  status: true,
  visibilityScope: true,
  createdByUserId: true,
  visibleRoleRefs: true,
  visibleUserRefs: true,
  visibleTeamRefs: true,
  visibleOrgUnitRefs: true,
  visiblePersonRefs: true,
  visibleTargetGroupRefs: true,
} as const satisfies Prisma.TargetSelect;

type TargetVisibilityRow = Prisma.TargetGetPayload<{ select: typeof TARGET_VISIBILITY_SELECT }>;

/**
 * Strategy Zielerreichung = share of visible, linked focus Ziele in canonical COMPLETED status.
 */
export async function computeStrategyGoalAchievementProgress(
  actor: ActorContext,
  targetIds: readonly string[],
): Promise<VereinsentwicklungProgressSnapshot> {
  if (!actor.tenantId || targetIds.length === 0) {
    return { completedCount: 0, totalCount: 0, percent: 0, contributingTaskIds: [] };
  }

  const rows = await prisma.target.findMany({
    where: { tenantId: actor.tenantId, id: { in: [...targetIds] } },
    select: TARGET_VISIBILITY_SELECT,
  });
  const visible = applyVisibilityFilter(rows, actor) as TargetVisibilityRow[];
  const completedCount = visible.filter((t) => t.status === TargetStatus.COMPLETED).length;
  const totalCount = visible.length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent, contributingTaskIds: [] };
}

export function formatGoalAchievementCountLabel(snapshot: VereinsentwicklungProgressSnapshot): string {
  if (snapshot.totalCount === 0) return "Noch keine Ziele";
  return `${snapshot.completedCount} von ${snapshot.totalCount} Zielen erreicht`;
}