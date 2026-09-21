import type { TaskContextType } from "@prisma/client";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { isSupportedTaskContextType } from "./context-registry";
import { assertTaskContextEntityReadable } from "./context-entity-read";
import { validateTaskContext } from "./context-validation";
import { hasTaskPermission } from "./visibility";
import type { TaskServiceContext } from "./types";

export type ContextualTaskCreateEligibilityDto = {
  canCreate: boolean;
  canViewRelatedTasks: boolean;
};

export async function resolveContextualTaskCreateEligibility(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
): Promise<ContextualTaskCreateEligibilityDto> {
  let canViewRelatedTasks = false;
  if (hasTaskPermission(ctx, PERMISSIONS.TASKS_VIEW)) {
    try {
      await assertTaskContextEntityReadable(ctx, contextType, contextId);
      canViewRelatedTasks = true;
    } catch {
      canViewRelatedTasks = false;
    }
  }

  let canCreate = false;
  if (hasTaskPermission(ctx, PERMISSIONS.TASKS_CREATE) && isSupportedTaskContextType(contextType)) {
    try {
      await validateTaskContext(ctx, contextType, contextId);
      canCreate = true;
    } catch {
      canCreate = false;
    }
  }

  return { canCreate, canViewRelatedTasks };
}
