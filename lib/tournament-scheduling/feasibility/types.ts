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
  /** When set, structural round/slot coordinates are scoped per group (01E3B). */
  tournamentGroupId?: string | null;
  roundIndex: number;
  slotIndexInRound: number;
  sideAParticipantId: string;
  sideBParticipantId: string;
}

/** Tournament-owned logical pitch (independent of FacilityResource). */
export interface FeasibilityTournamentPitchRef {
  tournamentPitchId: string;
  displayOrder: number;
  label: string;
  /** Playable intervals after tournament window ∩ break subtraction. */
  playableIntervals: FeasibilityInstantWindow[];
}

export type FeasibilityTournamentBreakScope = "ALL_PITCHES" | "SELECTED_PITCHES";

export interface FeasibilityTournamentBreakRef {
  breakId: string;
  startUtcMs: number;
  endUtcMs: number;
  scope: FeasibilityTournamentBreakScope;
  tournamentPitchIds?: readonly string[];
}

export interface FeasibilityAssignmentRef {
  fixtureId: string;
  tournamentPitchId: string;
  startUtcMs: number;
}

export interface TournamentFeasibilityInput {
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  fixtures: FeasibilityFixtureRef[];
  participants: FeasibilityParticipantRef[];
  tournamentPitches: FeasibilityTournamentPitchRef[];
  breaks: FeasibilityTournamentBreakRef[];
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
  | "PITCH.UNAVAILABLE"
  | "SLOTS.TOO_MANY_CANDIDATES"
  | "LOCKS.CONFLICTING"
  | "ASSIGNMENT.SEARCH_EXHAUSTED"
  | "LIMIT.PARTICIPANTS_EXCEEDED"
  | "LIMIT.FIXTURES_EXCEEDED"
  | "LIMIT.PITCHES_EXCEEDED"
  | "BREAK.INVALID"
  | "BREAK.OUTSIDE_WINDOW"
  | "BREAK.UNKNOWN_PITCH";

export interface FeasibilityDiagnostic {
  code: FeasibilityDiagnosticCode;
  /** Hard constraint id from 01A when applicable (H1–H12). */
  constraintId?: string;
  context?: Readonly<Record<string, string | number | boolean>>;
}

export type FeasibilitySuggestionCode =
  | "EXTEND_TOURNAMENT_WINDOW"
  | "ADD_TOURNAMENT_PITCH"
  | "REDUCE_MATCH_DURATION"
  | "REDUCE_TRANSITION_DURATION"
  | "REDUCE_MINIMUM_REST";

export interface FeasibilitySuggestion {
  code: FeasibilitySuggestionCode;
  context?: Readonly<Record<string, string | number | boolean>>;
}

export interface FeasibilityMetrics {
  fixtureCount: number;
  tournamentPitchCount: number;
  availableTournamentPitchMinutes: number;
  blockedTournamentPitchMinutes: number;
  requiredMatchMinutes: number;
  requiredPitchOccupancyMinutes: number;
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
  tournamentPitchId: string;
  startUtcMs: number;
  /** Pitch occupancy end (match + transition). */
  resourceEndUtcMs: number;
  /** Participant active end (match only). */
  participantEndUtcMs: number;
}
