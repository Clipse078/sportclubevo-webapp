import type { DevelopmentSprintGoalResult, TaskStatus } from "@prisma/client";

/** Product disposition for unfinished tasks at sprint close (API + UI). */
export type UnfinishedTaskDisposition = "BACKLOG" | "FUTURE_SPRINT" | "RETAIN_HISTORICAL";

/** Legacy API values mapped at route boundary. */
export type LegacyUnfinishedDisposition = "KEEP" | "REMOVE";

export function parseUnfinishedDisposition(
  raw: unknown,
): UnfinishedTaskDisposition | null {
  if (raw === "BACKLOG" || raw === "FUTURE_SPRINT" || raw === "RETAIN_HISTORICAL") {
    return raw;
  }
  if (raw === "REMOVE") return "BACKLOG";
  if (raw === "KEEP") return "RETAIN_HISTORICAL";
  return null;
}

export type SprintCloseTaskRow = {
  taskId: string;
  title: string;
  statusAtClose: TaskStatus;
  finished: boolean;
  disposition?: UnfinishedTaskDisposition;
  moveToSprintId?: string | null;
};

export type SprintCloseSnapshot = {
  version: 1;
  closedAt: string;
  goalResult: DevelopmentSprintGoalResult;
  reviewNotes: string | null;
  finishedTasks: SprintCloseTaskRow[];
  unfinishedTasks: SprintCloseTaskRow[];
  committedAtStartTaskIds: string[];
  addedAfterStartTaskIds: string[];
  defaultUnfinishedDisposition: UnfinishedTaskDisposition;
};

export type SprintCloseInput = {
  goalResult: DevelopmentSprintGoalResult;
  reviewNotes?: string | null;
  defaultUnfinishedDisposition: UnfinishedTaskDisposition;
  /** Per-task overrides for FUTURE_SPRINT or mixed handling. */
  taskDestinations?: {
    taskId: string;
    disposition: UnfinishedTaskDisposition;
    moveToSprintId?: string | null;
  }[];
};