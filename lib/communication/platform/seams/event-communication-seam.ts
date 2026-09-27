/**
 * SCE-COMM-01 — Event-context communication (attendance is Calendar/Participation domain).
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type { EventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";

export function eventCommunicationContext(eventId: string): CommunicationContextRef {
  return { kind: "EVENT", eventId: eventId.trim() };
}

/**
 * Presets map to participation queries in COMM-10 — not reimplemented here.
 * Communication MUST NOT duplicate RSVP/attendance tables.
 */
export type EventContextAudienceRequest = {
  tenantId: string;
  eventId: string;
  preset: EventAudiencePreset;
};

export const EVENT_PRESET_PARTICIPATION_FILTER: Record<
  EventAudiencePreset,
  "ALL" | "ACCEPTED" | "DECLINED" | "PENDING"
> = {
  ALL_INVITEES: "ALL",
  ACCEPTED_ONLY: "ACCEPTED",
  DECLINED_ONLY: "DECLINED",
  NOT_RESPONDED: "PENDING",
};
