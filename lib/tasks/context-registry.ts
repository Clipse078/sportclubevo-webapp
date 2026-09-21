import type { TaskContextType } from "@prisma/client";
import { taskCreateFromContextHref } from "./task-navigation";

export {
  SUPPORTED_TASK_CONTEXT_TYPES,
  TASK_CONTEXT_UNAVAILABLE_LABEL,
  buildOperationalContextHref,
  isSupportedTaskContextType,
  operationalReadPermissionForContext,
  taskContextTypeLabel,
  type SupportedTaskContextType,
} from "./task-context-types";

/** @deprecated Prefer taskCreateFromContextHref from task-navigation */
export function buildTaskCreateFromContextHref(
  contextType: TaskContextType,
  contextId: string,
): string {
  return taskCreateFromContextHref(contextType, contextId);
}
