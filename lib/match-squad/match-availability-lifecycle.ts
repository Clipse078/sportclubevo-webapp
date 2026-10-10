/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — match-relative availability collection lifecycle.
 */

import { SPIELBETRIEB_ATTENTION_EVENT_STATUSES } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-event-relevance";
import type { EventStatus } from "@prisma/client";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

export type MatchAvailabilityLifecycleInput = {
  status: string;
  startAt: Date;
  participationResponseDueAt?: Date | null;
  now?: Date;
};

function normalizeStatus(status: string): string {
  return status.trim().toUpperCase();
}

export function isMatchCancelledForAvailability(input: { status: string }): boolean {
  const normalized = normalizeStatus(input.status);
  return normalized === "CANCELLED" || normalized === "CANCELED";
}

export function isMatchPastForAvailability(input: {
  startAt: Date;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  return input.startAt.getTime() < now.getTime();
}

export function isMatchStatusActionableForAvailabilityCollection(input: {
  status: string;
}): boolean {
  const normalized = normalizeStatus(input.status) as EventStatus;
  return SPIELBETRIEB_ATTENTION_EVENT_STATUSES.includes(normalized);
}

/** Player/guardian may submit or change availability for an upcoming match. */
export function canRespondToMatchAvailability(input: MatchAvailabilityLifecycleInput): boolean {
  if (isMatchCancelledForAvailability(input)) return false;
  if (isMatchPastForAvailability(input)) return false;
  if (!isMatchStatusActionableForAvailabilityCollection(input)) return false;
  return true;
}

/** Trainer may configure deadline / treat request as active. */
export function canConfigureMatchAvailabilityRequest(input: MatchAvailabilityLifecycleInput): boolean {
  if (isMatchCancelledForAvailability(input)) return false;
  if (isMatchPastForAvailability(input)) return false;
  return isMatchStatusActionableForAvailabilityCollection(input);
}

/** Manual reminder requires an active Teilnahmeanfrage (deadline set). */
export function canSendMatchAvailabilityReminder(input: MatchAvailabilityLifecycleInput): boolean {
  if (!canConfigureMatchAvailabilityRequest(input)) return false;
  return isParticipationResponseRequested({
    participationResponseDueAt: input.participationResponseDueAt,
  });
}

export function matchAvailabilityReadOnlyReason(
  input: MatchAvailabilityLifecycleInput,
): string | null {
  if (isMatchCancelledForAvailability(input)) {
    return "Spiel abgesagt — keine neue Verfügbarkeitsanfrage.";
  }
  if (isMatchPastForAvailability(input)) {
    return "Vergangenes Spiel — Verfügbarkeit ist schreibgeschützt.";
  }
  if (!isMatchStatusActionableForAvailabilityCollection(input)) {
    return "Für diesen Spielstatus ist keine Verfügbarkeitssammlung möglich.";
  }
  return null;
}
