import type { DevelopmentSprintGoalResult } from "@prisma/client";
import type { SprintCloseSnapshot } from "./sprint-close-types";

export type SprintReviewViewModel = {
  goal: string | null;
  goalResult: DevelopmentSprintGoalResult | null;
  reviewNotes: string | null;
  startedAt: string | null;
  completedAt: string | null;
  committedAtStart: SprintCloseSnapshot["finishedTasks"];
  addedAfterStartCount: number;
  finishedAtClose: SprintCloseSnapshot["finishedTasks"];
  unfinishedAtClose: SprintCloseSnapshot["unfinishedTasks"];
  committedAtStartTaskIds: string[];
  addedAfterStartTaskIds: string[];
  fromSnapshot: boolean;
};