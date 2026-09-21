/**
 * AUFGABEN — shared task visibility gate for services (collaboration, reads, mutations).
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TaskForbiddenError, TaskNotFoundError } from "./errors";
import type { TaskServiceContext } from "./types";
import { canReadTask, hasTaskPermission } from "./visibility";

export const TASK_AUTH_INCLUDE = {
  assignees: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { assignedAt: "asc" as const },
  },
  orgUnit: { select: { tenantId: true } },
} satisfies Prisma.TaskInclude;

export type VisibleTaskRow = Prisma.TaskGetPayload<{ include: typeof TASK_AUTH_INCLUDE }>;

function assertCanView(ctx: TaskServiceContext): void {
  if (!hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    throw new TaskForbiddenError("Missing tasks.view");
  }
}

export async function loadTaskForTenantAuth(
  tenantId: string,
  taskId: string,
): Promise<VisibleTaskRow | null> {
  return prisma.task.findFirst({
    where: { id: taskId, tenantId },
    include: TASK_AUTH_INCLUDE,
  });
}

export function taskAuthorizationFromRow(row: VisibleTaskRow) {
  return {
    tenantId: row.tenantId,
    createdByUserId: row.createdByUserId,
    assigneeUserIds: row.assignees.map((a) => a.userId),
    visibilityScope: row.visibilityScope,
    orgUnitId: row.orgUnitId,
    orgUnitTenantId: row.orgUnit?.tenantId ?? null,
  };
}

export async function requireVisibleTask(
  ctx: TaskServiceContext,
  taskId: string,
): Promise<VisibleTaskRow> {
  assertCanView(ctx);
  const task = await loadTaskForTenantAuth(ctx.tenantId, taskId);
  if (!task) throw new TaskNotFoundError(taskId);

  if (!canReadTask(ctx, taskAuthorizationFromRow(task))) {
    throw new TaskForbiddenError();
  }

  return task;
}
