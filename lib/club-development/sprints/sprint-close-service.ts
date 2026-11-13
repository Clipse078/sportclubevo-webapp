import "server-only";

import { DevelopmentSprintStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { SprintServiceError } from "./sprint-service";

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

export function membershipIdsToSoftRemove(
  unfinishedTaskIds: string[],
  disposition: UnfinishedDisposition,
): string[] {
  if (disposition === "KEEP") return [];
  return [...unfinishedTaskIds];
}

export async function closeDevelopmentSprint(
  tenantId: string,
  sprintId: string,
  unfinishedDisposition: UnfinishedDisposition,
  closedAt: Date = new Date(),
) {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true, status: true },
  });
  if (!sprint) throw new SprintServiceError("Sprint nicht gefunden.");
  if (sprint.status === DevelopmentSprintStatus.COMPLETED) {
    throw new SprintServiceError("Sprint ist bereits abgeschlossen.");
  }

  const memberships = await prisma.developmentSprintTaskMembership.findMany({
    where: { tenantId, sprintId, removedAt: null },
    select: { id: true, taskId: true },
  });

  const taskRows =
    memberships.length > 0
      ? await prisma.task.findMany({
          where: { tenantId, id: { in: memberships.map((m) => m.taskId) } },
          select: { id: true, status: true },
        })
      : [];

  const statusByTask = new Map(taskRows.map((t) => [t.id, t.status]));
  const classified = classifySprintCloseTasks(
    memberships.map((m) => ({
      taskId: m.taskId,
      status: statusByTask.get(m.taskId) ?? TaskStatus.OPEN,
    })),
  );

  const toRemove = membershipIdsToSoftRemove(
    classified.unfinished.map((u) => u.taskId),
    unfinishedDisposition,
  );

  if (toRemove.length > 0) {
    const membershipIds = memberships
      .filter((m) => toRemove.includes(m.taskId))
      .map((m) => m.id);
    await prisma.developmentSprintTaskMembership.updateMany({
      where: { id: { in: membershipIds } },
      data: { removedAt: closedAt },
    });
  }

  await prisma.developmentSprint.update({
    where: { id: sprintId },
    data: {
      status: DevelopmentSprintStatus.COMPLETED,
      completedAt: closedAt,
    },
  });

  return {
    finishedCount: classified.finished.length,
    unfinishedCount: classified.unfinished.length,
    unfinishedDisposition,
    removedMembershipCount: toRemove.length,
  };
}
