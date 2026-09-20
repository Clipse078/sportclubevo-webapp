/**
 * AUFGABEN — canonical task visibility.
 *
 * tasks.view gates module access; row visibility is enforced separately:
 *
 * PERSONAL / RELEVANT (default with tasks.view only):
 *   - assigned to the current user
 *   - created by the current user
 *
 * TENANT-WIDE (tasks.view_all or tasks.manage):
 *   - all tasks in the active tenant (never cross-tenant)
 *
 * tasks.manage grants mutation authority and includes tenant-wide visibility.
 * tasks.view_all grants visibility only — not mutation.
 *
 * Task.visibilityScope (AUFGABEN-05-ORG-01) is persisted for future org-scoped reads
 * but is NOT consulted here until ORG-02 performs the authorization cutover.
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

/** Tenant-wide read visibility (management perspective, KPIs, assignee browsing). */
export function canViewAllTasks(ctx: TaskServiceContext): boolean {
  return (
    hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW_ALL) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  );
}

export function buildTaskVisibilityWhere(
  ctx: TaskServiceContext,
): Prisma.TaskWhereInput {
  if (canViewAllTasks(ctx)) {
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
  if (canViewAllTasks(ctx)) return true;
  if (task.createdByUserId === ctx.userId) return true;
  return task.assigneeUserIds.includes(ctx.userId);
}
