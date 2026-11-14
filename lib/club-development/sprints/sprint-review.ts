import "server-only";

import type { DevelopmentSprintGoalResult } from "@prisma/client";
import type { SprintCloseSnapshot } from "./sprint-close-types";
import type { SprintReviewViewModel } from "./sprint-review-types";

export type { SprintReviewViewModel } from "./sprint-review-types";

export function parseCloseSnapshot(raw: unknown): SprintCloseSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snap = raw as SprintCloseSnapshot;
  if (snap.version !== 1) return null;
  if (!snap.closedAt || !snap.goalResult) return null;
  return snap;
}

export function buildSprintReviewViewModel(input: {
  goal: string | null;
  goalResult: DevelopmentSprintGoalResult | null;
  reviewNotes: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  closeSnapshot: unknown;
}): SprintReviewViewModel {
  const snapshot = parseCloseSnapshot(input.closeSnapshot);
  if (snapshot) {
    return {
      goal: input.goal,
      goalResult: snapshot.goalResult,
      reviewNotes: snapshot.reviewNotes,
      startedAt: input.startedAt?.toISOString() ?? null,
      completedAt: snapshot.closedAt,
      committedAtStart: [
        ...snapshot.finishedTasks.filter((t) =>
          snapshot.committedAtStartTaskIds.includes(t.taskId),
        ),
        ...snapshot.unfinishedTasks.filter((t) =>
          snapshot.committedAtStartTaskIds.includes(t.taskId),
        ),
      ],
      addedAfterStartCount: snapshot.addedAfterStartTaskIds.length,
      finishedAtClose: snapshot.finishedTasks,
      unfinishedAtClose: snapshot.unfinishedTasks,
      committedAtStartTaskIds: snapshot.committedAtStartTaskIds,
      addedAfterStartTaskIds: snapshot.addedAfterStartTaskIds,
      fromSnapshot: true,
    };
  }

  return {
    goal: input.goal,
    goalResult: input.goalResult,
    reviewNotes: input.reviewNotes,
    startedAt: input.startedAt?.toISOString() ?? null,
    completedAt: input.completedAt?.toISOString() ?? null,
    committedAtStart: [],
    addedAfterStartCount: 0,
    finishedAtClose: [],
    unfinishedAtClose: [],
    committedAtStartTaskIds: [],
    addedAfterStartTaskIds: [],
    fromSnapshot: false,
  };
}