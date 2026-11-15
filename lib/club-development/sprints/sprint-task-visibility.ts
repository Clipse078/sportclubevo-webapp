import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import type { TaskServiceContext } from "@/lib/tasks/types";
import type { SprintCloseSnapshot } from "./sprint-close-types";

/** Task IDs among `taskIds` the actor may read (canonical `buildTaskReadWhere`). */
export async function resolveReadableSprintTaskIds(
  taskCtx: TaskServiceContext,
  taskIds: readonly string[],
): Promise<Set<string>> {
  const unique = [...new Set(taskIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const readWhere = buildTaskReadWhere(taskCtx);
  const rows = await prisma.task.findMany({
    where: {
      tenantId: taskCtx.tenantId,
      id: { in: unique },
      AND: [readWhere],
    },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

export function taskIdsPassingReadWhere(
  taskCtx: TaskServiceContext,
  extra: Prisma.TaskWhereInput = {},
): Prisma.TaskWhereInput {
  return {
    tenantId: taskCtx.tenantId,
    AND: [buildTaskReadWhere(taskCtx), extra],
  };
}

export type SprintCloseClientReport = {
  finishedCount: number;
  unfinishedCount: number;
  goalResult: SprintCloseSnapshot["goalResult"];
  idempotent: boolean;
  snapshot?: SprintCloseSnapshot;
};

/** Authorized read-model for close API responses (internal close still includes all memberships). */
export function filterSprintCloseClientReport(
  report: SprintCloseClientReport,
  authorizedTaskIds: Set<string>,
): SprintCloseClientReport {
  if (!report.snapshot) {
    return {
      ...report,
      finishedCount: 0,
      unfinishedCount: 0,
    };
  }
  const allow = (id: string) => authorizedTaskIds.has(id);
  const finished = report.snapshot.finishedTasks.filter((t) => allow(t.taskId));
  const unfinished = report.snapshot.unfinishedTasks.filter((t) => allow(t.taskId));
  const snapshot: SprintCloseSnapshot = {
    ...report.snapshot,
    finishedTasks: finished,
    unfinishedTasks: unfinished,
    committedAtStartTaskIds: report.snapshot.committedAtStartTaskIds.filter(allow),
    addedAfterStartTaskIds: report.snapshot.addedAfterStartTaskIds.filter(allow),
  };
  return {
    ...report,
    finishedCount: finished.length,
    unfinishedCount: unfinished.length,
    snapshot,
  };
}