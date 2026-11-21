import "server-only";

import type { TaskStatus } from "@prisma/client";
import { updateTask } from "@/lib/tasks/task-service";
import type { TaskServiceContext } from "@/lib/tasks/types";
import type { TaskDto } from "@/lib/tasks/types";
import {
  ParentHasOpenSubtasksError,
  TaskForbiddenError,
  TaskValidationError,
} from "@/lib/tasks/errors";
import { allowedVereinsentwicklungStatusTransitions } from "./vereinsentwicklung-task-status";

export class VereinsentwicklungTaskStatusMutationError extends Error {
  constructor(
    message: string,
    readonly code: "FORBIDDEN" | "VALIDATION" | "INVALID_STATUS",
  ) {
    super(message);
    this.name = "VereinsentwicklungTaskStatusMutationError";
  }
}

export function mapTaskStatusMutationError(err: unknown): VereinsentwicklungTaskStatusMutationError {
  if (err instanceof VereinsentwicklungTaskStatusMutationError) return err;
  if (err instanceof TaskForbiddenError) {
    return new VereinsentwicklungTaskStatusMutationError(
      "Keine Berechtigung zum Ändern des Status.",
      "FORBIDDEN",
    );
  }
  if (err instanceof ParentHasOpenSubtasksError) {
    return new VereinsentwicklungTaskStatusMutationError(
      "Die Aufgabe kann nicht abgeschlossen werden, solange offene Unteraufgaben bestehen.",
      "VALIDATION",
    );
  }
  if (err instanceof TaskValidationError) {
    return new VereinsentwicklungTaskStatusMutationError(err.message, "VALIDATION");
  }
  throw err;
}

export async function patchVereinsentwicklungTaskStatus(
  taskCtx: TaskServiceContext,
  taskId: string,
  nextStatus: TaskStatus,
  currentStatus?: TaskStatus,
): Promise<TaskDto> {
  if (currentStatus !== undefined) {
    const allowed = allowedVereinsentwicklungStatusTransitions(currentStatus);
    if (!allowed.includes(nextStatus)) {
      throw new VereinsentwicklungTaskStatusMutationError(
        "Dieser Statuswechsel ist im Arbeitsbereich nicht vorgesehen.",
        "INVALID_STATUS",
      );
    }
  }
  try {
    return await updateTask(taskCtx, taskId, { status: nextStatus });
  } catch (err) {
    throw mapTaskStatusMutationError(err);
  }
}