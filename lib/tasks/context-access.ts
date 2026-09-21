import type { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { TaskServiceContext } from "./types";
import { hasTaskPermission } from "./visibility";
import {
  isSupportedTaskContextType,
  operationalReadPermissionForContext,
} from "./context-registry";

/** Context selector is used when creating or editing task context references. */
export function canUseTaskContextSelector(ctx: TaskServiceContext): boolean {
  return (
    hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE) ||
    hasTaskPermission(ctx, PERMISSIONS.TASKS_MANAGE)
  );
}

export function canAttachTaskContext(
  ctx: TaskServiceContext,
  type: TaskContextType,
): boolean {
  if (!isSupportedTaskContextType(type)) return false;
  const perm = operationalReadPermissionForContext(type);
  if (!perm) return false;
  return hasTaskPermission(ctx, perm);
}

export function canResolveTaskContextDetails(
  ctx: TaskServiceContext,
  type: TaskContextType,
): boolean {
  return canAttachTaskContext(ctx, type);
}

/** Operational entity read gate for related Task list/count (06F1). */
export function canReadTaskContextEntity(
  ctx: TaskServiceContext,
  type: TaskContextType,
): boolean {
  return canAttachTaskContext(ctx, type);
}
