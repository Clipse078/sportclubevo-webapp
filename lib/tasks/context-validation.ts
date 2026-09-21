import type { TaskContextType } from "@prisma/client";
import { canAttachTaskContext } from "./context-access";
import { isSupportedTaskContextType } from "./context-registry";
import { validateTaskContextAttachable } from "./task-context-registry";
import { TaskValidationError } from "./errors";
import type { TaskServiceContext } from "./types";

export async function validateTaskContext(
  ctx: TaskServiceContext,
  contextType: TaskContextType | null | undefined,
  contextId: string | null | undefined,
): Promise<void> {
  const type = contextType ?? null;
  const id = contextId?.trim() ?? null;

  if (!type && !id) return;

  if (type && !id) {
    throw new TaskValidationError("contextId is required when contextType is set");
  }
  if (!type && id) {
    throw new TaskValidationError("contextType is required when contextId is set");
  }
  if (!type || !id) return;

  if (!isSupportedTaskContextType(type)) {
    throw new TaskValidationError(`Unsupported task context type: ${type}`);
  }

  if (!canAttachTaskContext(ctx, type)) {
    throw new TaskValidationError(
      "Missing permission to link this operational context type",
    );
  }

  const attachable = await validateTaskContextAttachable(ctx, type, id);
  if (!attachable) {
    throw new TaskValidationError(
      "Context entity not found in this tenant or type mismatch",
    );
  }
}
