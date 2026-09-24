import type { EventType } from "@prisma/client";

/** Canonical programme source types for Mein Programm (DASHBOARD-02). */
export type PersonalProgrammeSourceType =
  | "TRAINING"
  | "MATCH"
  | "TOURNAMENT"
  | "EVENT"
  | "MEETING";

export const PERSONAL_PROGRAMME_SOURCE_TYPES: readonly PersonalProgrammeSourceType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
] as const;

/** Normalized presentation status — maps domain-specific lifecycle values. */
export type PersonalProgrammePresentationStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "completed"
  | "live";

/**
 * Presentation-safe personal programme row.
 * Authorization and personal relevance are resolved before construction.
 */
export type PersonalProgrammeItem = {
  id: string;
  sourceType: PersonalProgrammeSourceType;
  startsAt: Date;
  endsAt?: Date | null;
  allDay?: boolean;
  title: string;
  subtitle?: string;
  contextLabel?: string;
  venue?: string;
  status?: PersonalProgrammePresentationStatus;
  deepLink: string;
  teamName?: string;
  opponentName?: string;
  homeAway?: string | null;
  typeLabel: string;
  eventType?: EventType | "MEETING";
  ariaLabel: string;
};

export function eventTypeToProgrammeSourceType(type: EventType): PersonalProgrammeSourceType {
  switch (type) {
    case "TRAINING":
      return "TRAINING";
    case "MATCH":
      return "MATCH";
    case "TOURNAMENT":
      return "TOURNAMENT";
    case "OTHER":
      return "EVENT";
    default:
      return "EVENT";
  }
}

export function programmeResourceKey(sourceType: PersonalProgrammeSourceType, resourceId: string): string {
  if (sourceType === "MEETING") return `meeting:${resourceId}`;
  if (sourceType === "TRAINING") return `training-session:${resourceId}`;
  return `event:${resourceId}`;
}
