/**
 * AUFGABEN-06F1 — entity authorization for contextual Task read paths (list/count/metadata).
 *
 * Distinct from attach/create: reading related Tasks requires operational entity readability,
 * not tasks.create. Entity ACL is delegated to the Task Context Registry.
 */

import type { TaskContextType } from "@prisma/client";
import { canReadTaskContextEntity } from "./context-access";
import { isSupportedTaskContextType } from "./context-registry";
import { validateTaskContextReadable } from "./task-context-registry";
import { TaskForbiddenError } from "./errors";
import type { TaskServiceContext } from "./types";

/**
 * Fail closed when the caller cannot read the context entity (independent of Task row ACL).
 */
export async function assertTaskContextEntityReadable(
  ctx: TaskServiceContext,
  contextType: TaskContextType,
  contextId: string,
): Promise<void> {
  const normalizedId = contextId.trim();
  if (!normalizedId) {
    throw new TaskForbiddenError("Context entity not accessible");
  }

  if (!isSupportedTaskContextType(contextType)) {
    throw new TaskForbiddenError("Context entity not accessible");
  }

  if (!canReadTaskContextEntity(ctx, contextType)) {
    throw new TaskForbiddenError("Context entity not accessible");
  }

  const readable = await validateTaskContextReadable(ctx, contextType, normalizedId);
  if (!readable) {
    throw new TaskForbiddenError("Context entity not accessible");
  }
}
