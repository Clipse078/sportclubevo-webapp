import "server-only";

import { TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type InitiativeProgressSnapshot = {
  progress: number;
  completedCount: number;
  eligibleCount: number;
  taskIds: string[];
};

/**
 * Canonical initiative progress from linked Aufgaben (direct INITIATIVE context
 * and MEETING_DECISION contexts tied to this Vorhaben via Traktanden).
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
    select: { id: true, status: true },
  });

  const byId = new Map<string, TaskStatus>();
  for (const task of tasks) {
    byId.set(task.id, task.status);
  }

  const taskIds = [...byId.keys()];
  const eligibleCount = taskIds.length;
  const completedCount = [...byId.values()].filter((s) => s === TaskStatus.DONE).length;
  const progress =
    eligibleCount === 0 ? 0 : Math.round((completedCount / eligibleCount) * 100);

  return { progress, completedCount, eligibleCount, taskIds };
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
