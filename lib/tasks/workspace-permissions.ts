import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskDto, TaskServiceContext } from "./types";
import { canManageTask, hasTaskPermission } from "./visibility";
import { canMutateTaskOrgVisibility } from "./task-org-mutation-policy";

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
  canEditOrgVisibility: boolean;
};

export function resolveTaskWorkspaceCapabilities(
  ctx: TaskServiceContext,
  task: TaskDto,
): TaskWorkspaceCapabilities {
  const isAssignee = task.assignees.some((a) => a.userId === ctx.userId);
  const isCreator = task.createdByUserId === ctx.userId;
  const canManage = canManageTask(ctx, {
    tenantId: task.tenantId,
    createdByUserId: task.createdByUserId,
    assigneeUserIds: task.assignees.map((a) => a.userId),
    visibilityScope: task.visibilityScope,
    orgUnitId: task.orgUnitId,
  });
  const canCreate = hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE);
  const canAssign =
    hasTaskPermission(ctx, PERMISSIONS.TASKS_ASSIGN) || canManage;

  const canEditFields = canManage || (isCreator && canCreate);
  const canEditStatus =
    canManage || (isCreator && canCreate) || isAssignee;

  const authRecord = {
    tenantId: task.tenantId,
    createdByUserId: task.createdByUserId,
    assigneeUserIds: task.assignees.map((a) => a.userId),
    visibilityScope: task.visibilityScope,
    orgUnitId: task.orgUnitId,
  };
  const canEditOrgVisibility = canMutateTaskOrgVisibility(
    ctx,
    authRecord,
    {
      visibilityScope: task.visibilityScope,
      orgUnitId: task.orgUnitId,
    },
    "edit",
  );

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
    canEditOrgVisibility,
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
    !caps.canEditContext &&
    !caps.canEditOrgVisibility;

  return caps;
}
