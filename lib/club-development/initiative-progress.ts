import "server-only";

import { TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  collectEligibleProgressLeafUnits,
  computeInitiativeProgressFromUnits,
} from "@/lib/tasks/task-hierarchy-progress";

export type InitiativeProgressSnapshot = {
  progress: number;
  completedCount: number;
  eligibleCount: number;
  taskIds: string[];
};

/**
 * Canonical initiative progress from linked Aufgaben (direct INITIATIVE context
 * and MEETING_DECISION contexts tied to this Vorhaben via Traktanden).
 *
 * SCE-TASK-01: parents with subtasks contribute their eligible children as leaf
 * units; parents are not double-counted.
 */
export async function computeInitiativeProgressSnapshot(
  tenantId: string,
  initiativeId: string,
): Promise<InitiativeProgressSnapshot> {
  const agendaItemIds = await prisma.meetingAgendaItem.findMany({
    where: { initiativeId, meeting: { tenantId } },
    select: { id: true },
  });
  const agendaIds = agendaItemIds.map((row) => row.id);

  const decisionIds =
    agendaIds.length > 0
      ? (
          await prisma.meetingDecision.findMany({
            where: {
              sourceAgendaItemId: { in: agendaIds },
              meeting: { tenantId },
            },
            select: { id: true },
          })
        ).map((row) => row.id)
      : [];

  const contextFilters = [
    { contextType: TaskContextType.INITIATIVE, contextId: initiativeId },
    ...(decisionIds.length > 0
      ? [{ contextType: TaskContextType.MEETING_DECISION, contextId: { in: decisionIds } }]
      : []),
  ];

  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      OR: contextFilters,
      status: { not: TaskStatus.CANCELLED },
    },
    select: { id: true, status: true, parentTaskId: true },
  });

  const leafUnits = collectEligibleProgressLeafUnits(tasks);
  const rolled = computeInitiativeProgressFromUnits(leafUnits);
  const taskIds = leafUnits.map((u) => u.id);

  return {
    progress: rolled.percent,
    completedCount: rolled.completedCount,
    eligibleCount: rolled.totalCount,
    taskIds,
  };
}

export async function syncInitiativeStoredProgress(
  tenantId: string,
  initiativeId: string,
): Promise<InitiativeProgressSnapshot> {
  const snapshot = await computeInitiativeProgressSnapshot(tenantId, initiativeId);
  await prisma.initiative.updateMany({
    where: { id: initiativeId, tenantId },
    data: { progress: snapshot.progress },
  });
  return snapshot;
}
