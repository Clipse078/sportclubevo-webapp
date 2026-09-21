/**
 * AUFGABEN-06F1-A2 — in-memory filter mirroring list/count related-task WHERE clauses.
 */

import type { Prisma, TaskContextType, TaskStatus } from "@prisma/client";
import { TaskVisibilityScope } from "@prisma/client";
import { canReadTask, type TaskAuthorizationRecord } from "../../task-authorization";
import type { TaskAccessGrantSnapshot } from "../../task-access-grants";
import type { TaskServiceContext } from "../../types";

export type RelatedTaskFixture = {
  id: string;
  tenantId: string;
  contextType: TaskContextType;
  contextId: string;
  status: TaskStatus;
  parentTaskId: string | null;
  createdByUserId: string;
  assigneeUserIds: string[];
  visibilityScope: TaskVisibilityScope;
  orgUnitId: string | null;
  accessGrants?: TaskAccessGrantSnapshot;
  title: string;
};

export function toAuthRecord(task: RelatedTaskFixture): TaskAuthorizationRecord {
  return {
    tenantId: task.tenantId,
    createdByUserId: task.createdByUserId,
    assigneeUserIds: task.assigneeUserIds,
    visibilityScope: task.visibilityScope,
    orgUnitId: task.orgUnitId,
    accessGrants: task.accessGrants,
  };
}

/** Mirrors canonical canReadTask for in-memory fixtures. */
export function matchesBuildTaskReadWhere(
  task: TaskAuthorizationRecord,
  serviceCtx: TaskServiceContext,
): boolean {
  return canReadTask(serviceCtx, task);
}

function readAndClause(where: Prisma.TaskWhereInput): Prisma.TaskWhereInput[] {
  const and = (where as { AND?: Prisma.TaskWhereInput[] }).AND;
  return Array.isArray(and) ? and : [];
}

export function matchesRelatedTaskWhere(
  task: RelatedTaskFixture,
  where: Prisma.TaskWhereInput,
  serviceCtx: TaskServiceContext,
): boolean {
  if (!matchesBuildTaskReadWhere(toAuthRecord(task), serviceCtx)) {
    return false;
  }

  for (const clause of readAndClause(where)) {
    if ("tenantId" in clause && clause.tenantId && task.tenantId !== clause.tenantId) {
      return false;
    }
    if (
      "contextType" in clause &&
      clause.contextType &&
      task.contextType !== clause.contextType
    ) {
      return false;
    }
    if (
      "contextId" in clause &&
      typeof clause.contextId === "string" &&
      task.contextId !== clause.contextId
    ) {
      return false;
    }
    if ("parentTaskId" in clause && clause.parentTaskId === null && task.parentTaskId !== null) {
      return false;
    }
    const statusIn = (clause as { status?: { in?: TaskStatus[] } }).status?.in;
    if (statusIn?.length && !statusIn.includes(task.status)) {
      return false;
    }
  }

  return true;
}

export function mapFixtureToListRow(task: RelatedTaskFixture) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: "NORMAL" as const,
    dueAt: null,
    parentTaskId: task.parentTaskId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    assignees: task.assigneeUserIds.map((userId) => ({
      userId,
      user: { firstName: "T", lastName: userId.slice(0, 4) },
    })),
  };
}
