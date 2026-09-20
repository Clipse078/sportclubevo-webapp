/**
 * AUFGABEN-05-ORG-04 — propagation-bound org/visibility (fail-closed).
 *
 * Subtasks and series-generated occurrences inherit org metadata from their
 * source at creation time. Client mutations must not widen or repoint scope.
 */

import { TaskForbiddenError } from "./errors";
import type { TaskOrgVisibilityState } from "./task-org-mutation-policy";

export function resolvePropagatedTaskOrgVisibility(
  source: TaskOrgVisibilityState,
): TaskOrgVisibilityState {
  return {
    visibilityScope: source.visibilityScope,
    orgUnitId: source.orgUnitId,
  };
}

export function isTaskOrgVisibilityPropagationLocked(task: {
  parentTaskId: string | null;
  taskSeriesId: string | null;
}): boolean {
  return task.parentTaskId != null || task.taskSeriesId != null;
}

export function assertTaskOrgVisibilityPropagationEditable(task: {
  parentTaskId: string | null;
  taskSeriesId: string | null;
}): void {
  if (!isTaskOrgVisibilityPropagationLocked(task)) {
    return;
  }
  if (task.taskSeriesId) {
    throw new TaskForbiddenError(
      "Organisation und Sichtbarkeit werden aus der Serie übernommen und können an dieser Aufgabe nicht geändert werden.",
    );
  }
  throw new TaskForbiddenError(
    "Organisation und Sichtbarkeit werden von der übergeordneten Aufgabe übernommen und können an Teilaufgaben nicht geändert werden.",
  );
}
