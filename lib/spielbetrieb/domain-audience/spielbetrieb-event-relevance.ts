/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — relevance window for operational attention (no arbitrary TTL).
 *
 * Rule (aligned with participation deadline projections + actionable lifecycle):
 * - Event types MATCH / TOURNAMENT only (not Training / club events in this package)
 * - Active Teilnahmeanfrage (`participationResponseDueAt` set — see `isParticipationResponseRequested`)
 * - `startAt >= now` (upcoming)
 * - Status SCHEDULED or LIVE (exclude CANCELLED, COMPLETED, POSTPONED, ARCHIVED, DRAFT)
 */

import type { EventStatus, EventType } from "@prisma/client";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

export { isParticipationResponseRequested };

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
  participationResponseDueAt?: Date | null;
}): boolean {
  if (!isSpielbetriebMatchOrTournament(input.type)) return false;
  if (!SPIELBETRIEB_ATTENTION_EVENT_STATUSES.includes(input.status)) return false;
  if (
    input.participationResponseDueAt !== undefined &&
    !isParticipationResponseRequested({ participationResponseDueAt: input.participationResponseDueAt })
  ) {
    return false;
  }
  return input.startAt.getTime() >= input.now.getTime();
}
