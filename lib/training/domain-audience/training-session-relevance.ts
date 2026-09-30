/**
 * SCE-TRAINING-AUDIENCE-01 — relevance window for training participation audiences + attention.
 *
 * Rule (aligned with Training operational-state + participation deadline workflow):
 * - Concrete `TrainingSession` occurrence only (not series-wide)
 * - Active Teilnahmeanfrage (`participationResponseDueAt` set — `isParticipationResponseRequested`)
 * - Status SCHEDULED (exclude CANCELLED, POSTPONED, MOVED, RECURRENCE_REMOVED)
 * - Effective start (`overrideStartAt ?? startAt`) >= now (future / today before kickoff; excludes in-progress and completed)
 */

import type { TrainingSessionStatus } from "@prisma/client";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

export { isParticipationResponseRequested };

export const TRAINING_ATTENTION_SESSION_STATUSES: readonly TrainingSessionStatus[] = [
  "SCHEDULED",
] as const;

export function trainingSessionEffectiveStartAt(input: {
  startAt: Date;
  overrideStartAt: Date | null;
}): Date {
  return input.overrideStartAt ?? input.startAt;
}

export function isTrainingSessionRelevantForParticipationAttention(input: {
  status: TrainingSessionStatus;
  startAt: Date;
  overrideStartAt?: Date | null;
  now: Date;
  participationResponseDueAt?: Date | null;
}): boolean {
  if (!TRAINING_ATTENTION_SESSION_STATUSES.includes(input.status)) return false;
  if (
    input.participationResponseDueAt !== undefined &&
    !isParticipationResponseRequested({ participationResponseDueAt: input.participationResponseDueAt })
  ) {
    return false;
  }
  const effectiveStart = trainingSessionEffectiveStartAt({
    startAt: input.startAt,
    overrideStartAt: input.overrideStartAt ?? null,
  });
  return effectiveStart.getTime() >= input.now.getTime();
}
