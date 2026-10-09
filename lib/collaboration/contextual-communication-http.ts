/**
 * SCE-COLLAB-01B-R5 — localized API errors for contextual activity communication.
 */

import { TeamCommunicationValidationError } from "@/lib/communication/team/team-communication-errors";

export const CONTEXTUAL_COMMUNICATION_ERROR_CODES = {
  NO_ELIGIBLE_RECIPIENTS: "NO_ELIGIBLE_RECIPIENTS",
} as const;

export type ContextualCommunicationErrorCode =
  (typeof CONTEXTUAL_COMMUNICATION_ERROR_CODES)[keyof typeof CONTEXTUAL_COMMUNICATION_ERROR_CODES];

/** Stable server-side message for zero-recipient dispatch guard (COMM-04). */
export const TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE =
  "no eligible recipients for dispatch";

export function mapContextualCommunicationValidationError(
  err: TeamCommunicationValidationError,
): { status: number; body: { error: string; errorCode?: ContextualCommunicationErrorCode } } {
  if (err.message === TEAM_COMMUNICATION_NO_ELIGIBLE_RECIPIENTS_MESSAGE) {
    return {
      status: 422,
      body: {
        errorCode: CONTEXTUAL_COMMUNICATION_ERROR_CODES.NO_ELIGIBLE_RECIPIENTS,
        error:
          "Für die ausgewählten Teams konnten aktuell keine berechtigten Empfänger ermittelt werden. Die Mitteilung kann deshalb noch nicht gesendet werden.",
      },
    };
  }
  return { status: 422, body: { error: err.message } };
}
