import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskDto, TaskServiceContext } from "./types";
import { hasTaskPermission } from "./visibility";

export type TaskWorkspaceCapabilities = {
  readOnly: boolean;
  canEditTitle: boolean;
  canEditDescription: boolean;
  canEditPriority: boolean;
  canEditDueAt: boolean;
  canEditStatus: boolean;
  canAssign: boolean;
  canComplete: boolean;
  canCancel: boolean;
  canCreateSubtask: boolean;
  canEditContext: boolean;
};

export function resolveTaskWorkspaceCapabilities(
  ctx: TaskServiceContext,
  task: TaskDto,
): TaskWorkspaceCapabilities {
  const isAssignee = task.assignees.some((a) => a.userId === ctx.userId);
  const isCreator = task.createdByUserId === ctx.userId;
  const canManage = hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE);
  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) || canManage;

  const canEditFields = canManage || (isCreator && canCreate);
  const canEditStatus =
    canManage || (isCreator && canCreate) || isAssignee;

  const caps: TaskWorkspaceCapabilities = {
    readOnly: false,
    canEditTitle: canEditFields,
    canEditDescription: canEditFields,
    canEditPriority: canEditFields,
    canEditDueAt: canEditFields,
    canEditStatus,
    canAssign,
    canComplete: canManage || isAssignee,
    canCancel: canManage || isCreator,
    canCreateSubtask: canCreate && !task.parentTaskId,
    canEditContext: canEditFields,
  };

  caps.readOnly =
    !caps.canEditTitle &&
    !caps.canEditDescription &&
    !caps.canEditPriority &&
    !caps.canEditDueAt &&
    !caps.canEditStatus &&
    !caps.canAssign &&
    !caps.canComplete &&
    !caps.canCancel &&
    !caps.canCreateSubtask &&
    !caps.canEditContext;

  return caps;
}
