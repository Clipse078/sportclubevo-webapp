/**
 * AUFGABEN-05-ORG-04 — propagation-bound org/visibility (fail-closed).
 *
 * Subtasks and series-generated occurrences inherit org metadata from their
 * source at creation time. Client mutations must not widen or repoint scope.
 */

import type { TaskVisibilityScope } from "@prisma/client";
import { TaskForbiddenError } from "./errors";
import {
  normalizeTaskOrgVisibilityState,
  type TaskOrgVisibilityState,
} from "./task-org-mutation-policy";

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

/** True only when requested org/visibility differs from persisted task state. */
export function requestsTaskOrgVisibilityChange(
  existing: TaskOrgVisibilityState,
  input: {
    orgUnitId?: string | null;
    visibilityScope?: TaskVisibilityScope;
  },
): boolean {
  if (input.orgUnitId === undefined && input.visibilityScope === undefined) {
    return false;
  }
  const next = normalizeTaskOrgVisibilityState(
    input.visibilityScope ?? existing.visibilityScope,
    input.orgUnitId !== undefined ? input.orgUnitId : existing.orgUnitId,
  );
  return (
    next.visibilityScope !== existing.visibilityScope ||
    (next.orgUnitId ?? null) !== (existing.orgUnitId ?? null)
  );
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
