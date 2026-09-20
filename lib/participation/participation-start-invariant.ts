/**
 * AUFGABEN-05-NOTIFY-DEADLINE — shared RSVP deadline vs. event/session start checks.
 */

import { ParticipationValidationError } from "./errors";

export const PARTICIPATION_EVENT_START_ERROR =
  "Die Antwortfrist muss vor dem Termin liegen.";

export const PARTICIPATION_TRAINING_START_ERROR =
  "Die Antwortfrist muss vor dem Training liegen.";

export function assertParticipationDueBeforeStart(
  participationResponseDueAt: Date | null | undefined,
  newStartAt: Date,
  message: string,
): void {
  if (!participationResponseDueAt) return;
  if (participationResponseDueAt.getTime() >= newStartAt.getTime()) {
    throw new ParticipationValidationError(message);
  }
}

export function assertParticipationDueBeforeEventStart(
  participationResponseDueAt: Date | null | undefined,
  newStartAt: Date,
): void {
  assertParticipationDueBeforeStart(
    participationResponseDueAt,
    newStartAt,
    PARTICIPATION_EVENT_START_ERROR,
  );
}

export function assertParticipationDueBeforeTrainingStart(
  participationResponseDueAt: Date | null | undefined,
  newStartAt: Date,
): void {
  assertParticipationDueBeforeStart(
    participationResponseDueAt,
    newStartAt,
    PARTICIPATION_TRAINING_START_ERROR,
  );
}
