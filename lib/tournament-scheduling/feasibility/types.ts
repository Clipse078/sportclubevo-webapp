import type { TournamentFeasibilityStatus } from "./status";

export type { TournamentFeasibilityStatus };

/** Unambiguous instant bounds for the pure engine (application normalizes civil time). */
export interface FeasibilityInstantWindow {
  startUtcMs: number;
  endUtcMs: number;
}

export interface FeasibilitySchedulingConfig {
  matchDurationMinutes: number;
  transitionMinutes: number;
  minRestMinutes: number;
}

export interface FeasibilityParticipantRef {
  participantId: string;
}

export interface FeasibilityFixtureRef {
  fixtureId: string;
  stageKey: string;
  roundIndex: number;
  slotIndexInRound: number;
  sideAParticipantId: string;
  sideBParticipantId: string;
}

export interface FeasibilityResourceRef {
  resourceId: string;
  /** Normalized playable intervals (already intersected with tournament window). */
  availabilityIntervals: FeasibilityInstantWindow[];
}

/** Read-only external occupancy (H10) — supplied by application layer. */
export interface FeasibilityExternalOccupancyInterval {
  resourceId: string;
  startUtcMs: number;
  endUtcMs: number;
}

export interface FeasibilityAssignmentRef {
  fixtureId: string;
  resourceId: string;
  startUtcMs: number;
}

export interface TournamentFeasibilityInput {
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  fixtures: FeasibilityFixtureRef[];
  participants: FeasibilityParticipantRef[];
  resources: FeasibilityResourceRef[];
  externalOccupancy: FeasibilityExternalOccupancyInterval[];
  /** FULL_ASSIGNMENT_LOCK (H7) — fixed pitch + start for regeneration feasibility. */
  lockedAssignments?: FeasibilityAssignmentRef[];
}

export type FeasibilityDiagnosticCode =
  | "FIXTURE_SET.INVALID"
  | "FIXTURE_SET.EMPTY"
  | "CAPACITY.PITCH_MINUTES_SHORT"
  | "CAPACITY.WINDOW_TOO_SHORT"
  | "CAPACITY.INSUFFICIENT_PARALLEL_PITCHES"
  | "REST.CANNOT_SATISFY_MIN_REST"
  | "RESOURCE.UNAVAILABLE"
  | "SLOTS.TOO_MANY_CANDIDATES"
  | "LOCKS.CONFLICTING"
  | "ASSIGNMENT.SEARCH_EXHAUSTED"
  | "LIMIT.PARTICIPANTS_EXCEEDED"
  | "LIMIT.FIXTURES_EXCEEDED"
  | "LIMIT.PITCHES_EXCEEDED";

export interface FeasibilityDiagnostic {
  code: FeasibilityDiagnosticCode;
  /** Hard constraint id from 01A when applicable (H1–H12). */
  constraintId?: string;
  context?: Readonly<Record<string, string | number | boolean>>;
}

export type FeasibilitySuggestionCode =
  | "EXTEND_TOURNAMENT_WINDOW"
  | "ADD_PLAYING_RESOURCE"
  | "REDUCE_MATCH_DURATION"
  | "REDUCE_TRANSITION_DURATION"
  | "REDUCE_MINIMUM_REST";

export interface FeasibilitySuggestion {
  code: FeasibilitySuggestionCode;
  context?: Readonly<Record<string, string | number | boolean>>;
}

export interface FeasibilityMetrics {
  fixtureCount: number;
  pitchCount: number;
  availablePitchMinutes: number;
  requiredMatchMinutes: number;
  requiredResourceOccupancyMinutes: number;
  minimumSlotsPerPitch: number;
  theoreticalSlotCapacity: number;
  candidateSlotCount: number;
  capacityUtilisation: number;
  minimumRequiredTournamentSpanMinutes: number;
  maxFixturesInSingleRound: number;
  participantMinRestSlackMinutes: number | null;
}

export interface TournamentFeasibilityResult {
  status: TournamentFeasibilityStatus;
  diagnostics: FeasibilityDiagnostic[];
  metrics: FeasibilityMetrics;
  suggestions: FeasibilitySuggestion[];
}

/** Ephemeral candidate slot — never persisted (01D). */
export interface FeasibilityCandidateSlot {
  slotIndex: number;
  resourceId: string;
  startUtcMs: number;
  /** Resource occupancy end (match + transition). */
  resourceEndUtcMs: number;
  /** Participant active end (match only). */
  participantEndUtcMs: number;
}
