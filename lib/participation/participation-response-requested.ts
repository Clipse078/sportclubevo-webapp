/**
 * Canonical signal that a participation request is active for an event/session.
 *
 * Repository truth: operators enable a Teilnahmeanfrage by setting
 * `participationResponseDueAt` (see participation-request-config-service).
 * Without a due date, squad members are not in an active Rückmeldung workflow.
 */

export function isParticipationResponseRequested(input: {
  participationResponseDueAt: Date | null | undefined;
}): boolean {
  return input.participationResponseDueAt != null;
}
