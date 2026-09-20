import type { TaskContextType } from "@prisma/client";
import type { TaskServiceContext } from "./types";
import { hasTaskPermission } from "./visibility";
import {
  isSupportedTaskContextType,
  operationalReadPermissionForContext,
} from "./context-registry";

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
