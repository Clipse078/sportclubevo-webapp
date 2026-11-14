import "server-only";

import {
  DevelopmentSprintGoalResult,
  DevelopmentSprintStatus,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { addTaskToSprint, SprintServiceError } from "./sprint-service";
import type { SprintCloseInput, SprintCloseSnapshot, UnfinishedTaskDisposition } from "./sprint-close-types";

export type { UnfinishedTaskDisposition };
/** @deprecated Use UnfinishedTaskDisposition — kept for existing tests */
export type UnfinishedDisposition = "KEEP" | "REMOVE";

export type SprintCloseTaskSummary = {
  taskId: string;
  status: TaskStatus;
  finished: boolean;
};

export function classifySprintCloseTasks(
  tasks: { taskId: string; status: TaskStatus }[],
): { finished: SprintCloseTaskSummary[]; unfinished: SprintCloseTaskSummary[] } {
  const finished: SprintCloseTaskSummary[] = [];
  const unfinished: SprintCloseTaskSummary[] = [];
  for (const task of tasks) {
    const row: SprintCloseTaskSummary = {
      taskId: task.taskId,
      status: task.status,
      finished: task.status === TaskStatus.DONE,
    };
    if (row.finished) finished.push(row);
    else unfinished.push(row);
  }
  return { finished, unfinished };
}

/** @deprecated Legacy helper — REMOVE ≡ BACKLOG, KEEP ≡ RETAIN_HISTORICAL */
export function membershipIdsToSoftRemove(
  unfinishedTaskIds: string[],
  disposition: UnfinishedDisposition,
): string[] {
  if (disposition === "KEEP") return [];
  return [...unfinishedTaskIds];
}

function resolveTaskDisposition(
  taskId: string,
  input: SprintCloseInput,
): { disposition: UnfinishedTaskDisposition; moveToSprintId: string | null } {
  const override = input.taskDestinations?.find((d) => d.taskId === taskId);
  if (override) {
    return {
      disposition: override.disposition,
      moveToSprintId: override.moveToSprintId ?? null,
    };
  }
  return {
    disposition: input.defaultUnfinishedDisposition,
    moveToSprintId: null,
  };
}

async function assertEligibleFutureSprint(
  tenantId: string,
  sprintId: string,
  targetSprintId: string,
) {
  const target = await prisma.developmentSprint.findFirst({
    where: { id: targetSprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!target) throw new SprintServiceError("Ziel-Sprint nicht gefunden.");
  if (target.id === sprintId) throw new SprintServiceError("Aufgabe kann nicht in denselben Sprint verschoben werden.");
  if (target.status === DevelopmentSprintStatus.COMPLETED) {
    throw new SprintServiceError("Abgeschlossene Sprints sind als Ziel nicht erlaubt.");
  }
}

export async function closeDevelopmentSprint(
  tenantId: string,
  sprintId: string,
  input: SprintCloseInput,
  closedAt: Date = new Date(),
  /** Idempotency token — repeat POST with same key returns stored snapshot without re-applying. */
  clientRequestId?: string | null,
) {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: {
      id: true,
      status: true,
      closeSnapshot: true,
      goalResult: true,
    },
  });
  if (!sprint) throw new SprintServiceError("Sprint nicht gefunden.");

  if (sprint.status === DevelopmentSprintStatus.COMPLETED) {
    const existing = sprint.closeSnapshot as SprintCloseSnapshot | null;
    if (existing?.version === 1) {
      return {
        finishedCount: existing.finishedTasks.length,
        unfinishedCount: existing.unfinishedTasks.length,
        goalResult: existing.goalResult,
        idempotent: true,
        snapshot: existing,
      };
    }
    throw new SprintServiceError("Sprint ist bereits abgeschlossen.");
  }

  if (sprint.status !== DevelopmentSprintStatus.ACTIVE) {
    throw new SprintServiceError("Nur aktive Sprints können abgeschlossen werden.");
  }

  if (!Object.values(DevelopmentSprintGoalResult).includes(input.goalResult)) {
    throw new SprintServiceError("Sprint-Zielergebnis ist erforderlich.");
  }

  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: {
      id: true,
      taskId: true,
      committedAtSprintStart: true,
      addedAfterSprintStart: true,
    },
  });

  const taskRows =
    memberships.length > 0
      ? await prisma.task.findMany({
          where: { tenantId, id: { in: memberships.map((m) => m.taskId) } },
          select: { id: true, title: true, status: true },
        })
      : [];

  const titleById = new Map(taskRows.map((t) => [t.id, t.title]));
  const statusByTask = new Map(taskRows.map((t) => [t.id, t.status]));
  const classified = classifySprintCloseTasks(
    memberships.map((m) => ({
      taskId: m.taskId,
      status: statusByTask.get(m.taskId) ?? TaskStatus.OPEN,
    })),
  );

  const committedAtStartTaskIds = memberships
    .filter((m) => m.committedAtSprintStart)
    .map((m) => m.taskId);
  const addedAfterStartTaskIds = memberships
    .filter((m) => m.addedAfterSprintStart)
    .map((m) => m.taskId);

  const finishedTasks = classified.finished.map((t) => ({
    taskId: t.taskId,
    title: titleById.get(t.taskId) ?? "Aufgabe",
    statusAtClose: t.status,
    finished: true as const,
  }));

  const unfinishedTasks = classified.unfinished.map((t) => {
    const dest = resolveTaskDisposition(t.taskId, input);
    return {
      taskId: t.taskId,
      title: titleById.get(t.taskId) ?? "Aufgabe",
      statusAtClose: t.status,
      finished: false as const,
      disposition: dest.disposition,
      moveToSprintId: dest.moveToSprintId,
    };
  });

  for (const row of unfinishedTasks) {
    if (row.disposition === "FUTURE_SPRINT") {
      if (!row.moveToSprintId) {
        throw new SprintServiceError(
          `Für Aufgabe „${row.title}" ist ein Ziel-Sprint für die Verschiebung erforderlich.`,
        );
      }
      await assertEligibleFutureSprint(tenantId, sprintId, row.moveToSprintId);
    }
  }

  const snapshot: SprintCloseSnapshot = {
    version: 1,
    closedAt: closedAt.toISOString(),
    goalResult: input.goalResult,
    reviewNotes: input.reviewNotes?.trim() || null,
    finishedTasks,
    unfinishedTasks,
    committedAtStartTaskIds,
    addedAfterStartTaskIds,
    defaultUnfinishedDisposition: input.defaultUnfinishedDisposition,
  };

  await prisma.$transaction(async (tx) => {
    for (const row of unfinishedTasks) {
      const membership = memberships.find((m) => m.taskId === row.taskId);
      if (!membership) continue;

      if (row.disposition === "RETAIN_HISTORICAL") {
        continue;
      }

      if (row.disposition === "BACKLOG") {
        await tx.developmentSprintTaskMembership.update({
          where: { id: membership.id },
          data: { removedAt: closedAt },
        });
        continue;
      }

      if (row.disposition === "FUTURE_SPRINT" && row.moveToSprintId) {
        await tx.developmentSprintTaskMembership.update({
          where: { id: membership.id },
          data: { removedAt: closedAt },
        });
      }
    }

    await tx.developmentSprint.update({
      where: { id: sprintId },
      data: {
        status: DevelopmentSprintStatus.COMPLETED,
        completedAt: closedAt,
        goalResult: input.goalResult,
        reviewNotes: input.reviewNotes?.trim() || null,
        closeSnapshot: snapshot,
      },
    });

    for (const row of unfinishedTasks) {
      if (row.disposition === "FUTURE_SPRINT" && row.moveToSprintId) {
        await addTaskToSprint(tenantId, row.moveToSprintId, row.taskId, tx);
      }
    }
  });

  void clientRequestId;

  return {
    finishedCount: finishedTasks.length,
    unfinishedCount: unfinishedTasks.length,
    goalResult: input.goalResult,
    idempotent: false,
    snapshot,
  };
}

/** Legacy close — maps KEEP/REMOVE to new dispositions */
export async function closeDevelopmentSprintLegacy(
  tenantId: string,
  sprintId: string,
  unfinishedDisposition: UnfinishedDisposition,
  closedAt: Date = new Date(),
) {
  return closeDevelopmentSprint(
    tenantId,
    sprintId,
    {
      goalResult: DevelopmentSprintGoalResult.PARTLY_ACHIEVED,
      defaultUnfinishedDisposition:
        unfinishedDisposition === "REMOVE" ? "BACKLOG" : "RETAIN_HISTORICAL",
    },
    closedAt,
  );
}