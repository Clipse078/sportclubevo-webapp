/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — relevance window for operational attention (no arbitrary TTL).
 *
 * Rule (aligned with `listUpcomingParticipationEvents` + actionable lifecycle):
 * - Event types MATCH / TOURNAMENT only (not Training / club events in this package)
 * - `startAt >= now` (upcoming)
 * - Status SCHEDULED or LIVE (exclude CANCELLED, COMPLETED, POSTPONED, ARCHIVED, DRAFT)
 */

import type { EventStatus, EventType } from "@prisma/client";

export const SPIELBETRIEB_ATTENTION_EVENT_STATUSES: readonly EventStatus[] = [
  "SCHEDULED",
  "LIVE",
] as const;

export function isSpielbetriebMatchOrTournament(type: EventType): boolean {
  return type === "MATCH" || type === "TOURNAMENT";
}

export function isSpielbetriebEventRelevantForParticipationAttention(input: {
  type: EventType;
  status: EventStatus;
  startAt: Date;
  now: Date;
}): boolean {
  if (!isSpielbetriebMatchOrTournament(input.type)) return false;
  if (!SPIELBETRIEB_ATTENTION_EVENT_STATUSES.includes(input.status)) return false;
  return input.startAt.getTime() >= input.now.getTime();
}
