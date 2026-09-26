import type { EventType, TaskStatus } from "@prisma/client";
import type { PersonalProgrammePresentationStatus } from "./personal-programme-types";

/** Application-level semantic types for personal calendar (not a Prisma enum). */
export type CalendarItemSemanticType =
  | "TRAINING"
  | "MATCH"
  | "TOURNAMENT"
  | "EVENT"
  | "MEETING"
  | "TASK";

export const CALENDAR_ITEM_SEMANTIC_TYPES: readonly CalendarItemSemanticType[] = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "EVENT",
  "MEETING",
  "TASK",
] as const;

/**
 * Presentation-independent personal calendar row.
 * Instants remain Date objects on the server (RSC convention).
 */
export type NormalizedCalendarItem = {
  /** Stable cross-source identity (e.g. training-session:{id}, task:{id}). */
  id: string;
  /** Repository projection key prefix (training-session, event, meeting, task). */
  sourceType: string;
  sourceId: string;
  semanticType: CalendarItemSemanticType;

  title: string;
  subtitle?: string;
  contextLabel?: string;

  startAt: Date;
  endAt?: Date | null;
  allDay: boolean;

  status?: PersonalProgrammePresentationStatus;
  taskStatus?: TaskStatus;

  team?: { name?: string };
  location?: string;
  opponentName?: string;
  homeAway?: string | null;

  deepLink: string | null;
  /** SCE Icon System V2 registry name when defined; presentation renders the icon. */
  iconKey: string | null;

  typeLabel: string;
  eventType?: EventType | "MEETING";
  ariaLabel: string;
};
