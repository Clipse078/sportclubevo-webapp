import type { EventType } from "@prisma/client";
import type { PersonalProgrammePresentationStatus } from "@/lib/personal-agenda/personal-programme-types";

/** Canonical sporting activity kinds for SCE presentation (read-model only). */
export type SportingActivityKind = "TRAINING" | "MATCH" | "TOURNAMENT" | "EVENT";

export type SportingLocationMode = "HOME" | "AWAY" | "NEUTRAL" | "UNKNOWN";

/**
 * Structured location — never a single ambiguous blob at this layer.
 * Display lines are derived separately; absent fields stay absent.
 */
export type SportingActivityLocation = {
  mode: SportingLocationMode;
  /** Away host club or tournament organiser when known. */
  hostOrOrganiser?: string;
  venueName?: string;
  address?: string;
  /** Pitch / hall / room — only when explicitly known from source data. */
  facilityResource?: string;
};

export type SportingActivityIdentity = {
  /** Stable consumer key, e.g. training-session:{id} or event:{id}. */
  resourceKey: string;
  title: string;
  typeLabel: string;
  activityKind: SportingActivityKind;
};

export type SportingActivityTeamContext = {
  name: string;
};

export type SportingActivityParticipants = {
  /** Compact fixture label (e.g. own team – opponent). */
  fixtureLine?: string;
  opponentName?: string;
  homeAway?: SportingLocationMode;
};

export type SportingActivityCompetitionContext = {
  competitionLabel?: string;
  organiser?: string;
};

export type SportingActivitySchedule = {
  startAt: string;
  endAt?: string | null;
  meetingAt?: string | null;
  allDay?: boolean;
};

export type SportingActivityParticipation = {
  /** Presentation-only; never invented by adapters. */
  state: "pending" | "attending" | "declined";
  label?: string;
};

/**
 * Serializable presentation snapshot embedded on programme/calendar rows.
 * Source domains remain authoritative — this is a consumer contract only.
 */
export type SportingActivityPresentation = {
  identity: SportingActivityIdentity;
  schedule: SportingActivitySchedule;
  team?: SportingActivityTeamContext;
  participants?: SportingActivityParticipants;
  context?: SportingActivityCompetitionContext;
  location: SportingActivityLocation;
  status?: PersonalProgrammePresentationStatus;
  participation?: SportingActivityParticipation;
  eventType?: EventType;
};

/**
 * UX-01 formatter output density. For layout surfaces (Mein Programm, Wochenplaner, management),
 * prefer `SportingActivityDensity` in `@/lib/sporting-activity-design` (`compact` | `planner` | `management`).
 */
export type SportingActivityPresentationDensity = "compact" | "standard" | "detail";
