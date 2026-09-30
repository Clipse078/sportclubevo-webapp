/**
 * SCE-EVENTS-AUDIENCE-01 — relevance window for Veranstaltung participation attention.
 */

import type { EventStatus, EventType } from "@prisma/client";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

export { isParticipationResponseRequested };

export const CLUB_EVENT_ATTENTION_STATUSES: readonly EventStatus[] = ["SCHEDULED", "LIVE"] as const;

export function isClubEventType(type: EventType): boolean {
  return type === "OTHER";
}

export function clubEventEffectiveEndAt(input: { startAt: Date; endAt: Date | null }): Date {
  return input.endAt ?? input.startAt;
}

/**
 * Actionable while the Veranstaltung has not ended (aligned with Veranstaltungen management tabs).
 */
export function isClubEventRelevantForParticipationAttention(input: {
  type: EventType;
  status: EventStatus;
  startAt: Date;
  endAt: Date | null;
  now: Date;
  participationResponseDueAt?: Date | null;
}): boolean {
  if (!isClubEventType(input.type)) return false;
  if (!CLUB_EVENT_ATTENTION_STATUSES.includes(input.status)) return false;
  if (
    input.participationResponseDueAt !== undefined &&
    !isParticipationResponseRequested({ participationResponseDueAt: input.participationResponseDueAt })
  ) {
    return false;
  }
  return clubEventEffectiveEndAt(input).getTime() >= input.now.getTime();
}
