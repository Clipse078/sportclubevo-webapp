import type { EventType, TaskStatus } from "@prisma/client";
import type { PersonalProgrammePresentationStatus } from "./personal-programme-types";

/** Normalized personal agenda / calendar projection sources (AUFGABEN-04A + DASHBOARD-02). */
export type PersonalAgendaSourceType =
  | "TRAINING"
  | "MATCH"
  | "TOURNAMENT"
  | "EVENT"
  | "TEAM_EVENT"
  | "MEETING"
  | "TASK"
  | "PARTICIPATION";

export type PersonalCalendarItem = {
  /** Stable cross-entity identity, e.g. `task:{id}`, `event:{id}`, `meeting:{id}`. */
  id: string;
  sourceType: PersonalAgendaSourceType;
  title: string;
  startAt: Date;
  endAt?: Date | null;
  /** Task deadlines are date-oriented (stored at tenant-local noon UTC anchor). */
  allDay?: boolean;
  href?: string;
  typeLabel: string;
  subtitle?: string;
  eventType?: EventType | "MEETING";
  taskStatus?: TaskStatus;
  /** Accessible label including source and title (not color-only). */
  ariaLabel: string;
  /** Human-facing “why am I seeing this?” label (DASHBOARD-01). */
  contextLabel?: string;
  venue?: string;
  presentationStatus?: PersonalProgrammePresentationStatus;
  teamName?: string;
  opponentName?: string;
  homeAway?: string | null;
};

export function buildTaskProjectionId(taskId: string): string {
  return `task:${taskId}`;
}

export function buildEventProjectionId(eventId: string): string {
  return `event:${eventId}`;
}

export function buildMeetingProjectionId(meetingId: string): string {
  return `meeting:${meetingId}`;
}
