/**
 * SCE-TOURNAMENT-PLANNER-01B — pure domain definitions for fixtures and schedules.
 * No Prisma or I/O in this module.
 */

/** Stable fixture identity metadata (WHO plays whom). */
export interface TournamentFixtureDefinition {
  id: string;
  eventId: string;
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  generatorKey: string | null;
  sideAParticipantId: string;
  sideBParticipantId: string;
}

export type TournamentScheduleVersionStatus = "WORKING" | "APPROVED" | "SUPERSEDED";

/** Versioned schedule container + optimistic revision. */
export interface TournamentScheduleVersionDefinition {
  id: string;
  eventId: string;
  versionNumber: number;
  status: TournamentScheduleVersionStatus;
  revision: number;
  matchDurationMinutes: number | null;
  transitionMinutes: number | null;
  minRestMinutes: number | null;
  approvedAt: string | null;
  supersededAt: string | null;
}

/** WHEN + WHERE for one fixture within one schedule version. */
export interface TournamentFixtureAssignmentDefinition {
  id: string;
  scheduleVersionId: string;
  fixtureId: string;
  facilityResourceId: string;
  startAt: string;
  endAt: string;
  isLocked: boolean;
  lockedAt: string | null;
  lockedByUserId: string | null;
}

/** Loaded schedule snapshot for a version (fixtures + assignments). */
export interface TournamentScheduleSnapshot {
  version: TournamentScheduleVersionDefinition;
  fixtures: TournamentFixtureDefinition[];
  assignments: TournamentFixtureAssignmentDefinition[];
}

export interface CreateTournamentFixtureInput {
  stageKey?: string;
  roundIndex: number;
  slotIndexInRound: number;
  generatorKey?: string | null;
  sideAParticipantId: string;
  sideBParticipantId: string;
}

export interface CreateTournamentScheduleVersionInput {
  matchDurationMinutes?: number | null;
  transitionMinutes?: number | null;
  minRestMinutes?: number | null;
}

export interface PersistTournamentFixtureAssignmentInput {
  fixtureId: string;
  facilityResourceId: string;
  startAt: Date;
  /** When omitted, derived from schedule version matchDurationMinutes or tenant default. */
  endAt?: Date;
}

export interface UpdateTournamentFixtureAssignmentInput {
  facilityResourceId?: string;
  startAt?: Date;
  endAt?: Date;
}

/** Future pure-engine contracts (01C+) — no implementations in 01B. */
export interface FixtureGenerationInput {
  format: unknown;
  participants: { participantId: string }[];
}

export interface ScheduleTournamentInput {
  tournamentId: string;
  scheduleVersionId: string;
  fixtures: TournamentFixtureDefinition[];
}
