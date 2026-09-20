/**
 * AUFGABEN-01 — MVP task visibility.
 *
 * A user may see a task when ANY of:
 *   1. They are a structured assignee (TaskAssignee.userId)
 *   2. They created the task (createdByUserId)
 *   3. They hold tasks.manage for the tenant (operational managers)
 *
 * tasks.view alone does NOT grant tenant-wide visibility — it gates module
 * access; the rules above filter rows.
 */

import type { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "./types";

export function hasTaskPermission(
  ctx: TaskServiceContext,
  permission: string,
): boolean {
  return ctx.permissionKeys.includes(permission);
}

export function canManageAllTasks(ctx: TaskServiceContext): boolean {
  return hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
}

export function buildTaskVisibilityWhere(
  ctx: TaskServiceContext,
): Prisma.TaskWhereInput {
  if (canManageAllTasks(ctx)) {
    return { tenantId: ctx.tenantId };
  }

  return {
    tenantId: ctx.tenantId,
    OR: [
      { createdByUserId: ctx.userId },
      { assignees: { some: { userId: ctx.userId, tenantId: ctx.tenantId } } },
    ],
  };
}

export function canViewTaskRecord(
  ctx: TaskServiceContext,
  task: {
    tenantId: string;
    createdByUserId: string | null;
    assigneeUserIds: string[];
  },
): boolean {
  if (task.tenantId !== ctx.tenantId) return false;
  if (canManageAllTasks(ctx)) return true;
  if (task.createdByUserId === ctx.userId) return true;
  return task.assigneeUserIds.includes(ctx.userId);
}
