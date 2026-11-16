import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskDto, TaskServiceContext } from "./types";
import { canReadTask, hasTaskPermission } from "./visibility";

export type TaskDeletionWorkspaceSignals = {
  canDeletePermanently: boolean;
  /** Shown to task administrators who can access the row but lack tasks.delete. */
  showDeletePermissionGapHint: boolean;
};

/**
 * Shared UI policy for permanent task deletion — mirrors DELETE
 * /api/tasks/[taskId]/permanent (tenant tasks.delete + visible row).
 * Does not treat tasks.manage as a substitute for tasks.delete.
 */
export function resolveTaskDeletionWorkspaceSignals(
  ctx: TaskServiceContext,
  task: TaskDto,
  hasTenantDeletionAuthority: boolean,
): TaskDeletionWorkspaceSignals {
  const authRecord = {
    tenantId: task.tenantId,
    createdByUserId: task.createdByUserId,
    assigneeUserIds: task.assignees.map((a) => a.userId),
    visibilityScope: task.visibilityScope,
    orgUnitId: task.orgUnitId,
  };

  const canAccess = canReadTask(ctx, authRecord);
  const canDeletePermanently = Boolean(hasTenantDeletionAuthority && canAccess);

  const showDeletePermissionGapHint =
    !canDeletePermanently &&
    canAccess &&
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);

  return { canDeletePermanently, showDeletePermissionGapHint };
}