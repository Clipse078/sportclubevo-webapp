/**
 * AUFGABEN-06E — trusted contextual Task creation (entity pages, server-known context).
 */

import type { TaskContextType } from "@prisma/client";
import { TaskValidationError } from "./errors";
import { validateTaskContext } from "./context-validation";
import { createTask } from "./task-service";
import type { CreateTaskInput, TaskDto, TaskServiceContext } from "./types";

export type TrustedTaskContextDefaults = {
  contextType: TaskContextType;
  contextId: string;
};

export type CreateTaskWithContextDefaultsInput = {
  /** User-editable Task fields (must not silently override trusted context). */
  task: Omit<CreateTaskInput, "contextType" | "contextId">;
  trustedContext: TrustedTaskContextDefaults;
};

function assertNoClientContextOverride(task: CreateTaskInput): void {
  const hasType = task.contextType !== undefined && task.contextType !== null;
  const hasId = task.contextId !== undefined && task.contextId !== null && task.contextId.trim() !== "";
  if (hasType || hasId) {
    throw new TaskValidationError("Context must be supplied via trusted server defaults only.");
  }
}

function assertTrustedContextMatches(
  trusted: TrustedTaskContextDefaults,
  validatedType: TaskContextType,
  validatedId: string,
): void {
  if (trusted.contextType !== validatedType || trusted.contextId.trim() !== validatedId.trim()) {
    throw new TaskValidationError("Trusted task context failed validation.");
  }
}

/**
 * Creates a Task with server-trusted context defaults after canonical validation.
 * Reuses `createTask` — no duplicated creation logic.
 */
export async function createTaskWithContextDefaults(
  ctx: TaskServiceContext,
  input: CreateTaskWithContextDefaultsInput,
): Promise<TaskDto> {
  assertNoClientContextOverride(input.task as CreateTaskInput);

  const contextType = input.trustedContext.contextType;
  const contextId = input.trustedContext.contextId.trim();
  await validateTaskContext(ctx, contextType, contextId);
  assertTrustedContextMatches(input.trustedContext, contextType, contextId);

  return createTask(ctx, {
    ...input.task,
    contextType,
    contextId,
  });
}
