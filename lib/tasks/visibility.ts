/**
 * AUFGABEN — task module permission helpers.
 *
 * Row/collection authorization lives in task-authorization.ts (ORG-02).
 */

import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "./types";

export {
  buildTaskReadWhere,
  buildTaskSeriesReadWhere,
  buildTaskVisibilityWhere,
  canManageTask,
  canManageTaskSeries,
  canReadTask,
  canReadTaskSeries,
  canViewTaskRecord,
  EMPTY_TASK_AUTH_SCOPE,
  hasTenantWideClubTaskRead,
  loadTaskAuthScope,
  loadAuthorizedParentTaskRefs,
  orgReadableUnitIds,
  type TaskAuthorizationRecord,
  type TaskSeriesAuthorizationRecord,
} from "./task-authorization";

export type { TaskAuthScope } from "./types";

export function hasTaskPermission(
  ctx: TaskServiceContext,
  permission: string,
): boolean {
  return ctx.permissionKeys.includes(permission);
}

export function canManageAllTasks(ctx: TaskServiceContext): boolean {
  return hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
}

/**
 * Tenant-wide management list perspective (ALLE, KPIs, assignee browsing).
 * Does NOT grant confidential Task reads — see hasTenantWideClubTaskRead.
 */
export function canViewAllTasks(ctx: TaskServiceContext): boolean {
  return (
    hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW_ALL) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  );
}
