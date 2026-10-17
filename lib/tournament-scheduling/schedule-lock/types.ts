/**
 * SCE-TOURNAMENT-PLANNER-01G — tournament fixture schedule lock semantics (pure domain).
 */

export type TournamentFixtureScheduleLockDimension = "TIME" | "PITCH" | "TIME_AND_PITCH";

/** Lock on a fixture scheduling decision (time and/or TournamentPitch). */
export type TournamentFixtureScheduleLock = {
  fixtureId: string;
  dimension: TournamentFixtureScheduleLockDimension;
};

export type ScheduleLockConflictCategory =
  | "PITCH_OVERLAP"
  | "PARTICIPANT_OVERLAP"
  | "MINIMUM_REST"
  | "BREAK_CONFLICT"
  | "INVALID_TOURNAMENT_PITCH"
  | "QUALIFICATION_DEPENDENCY"
  | "OUTSIDE_TOURNAMENT_WINDOW"
  | "UNKNOWN_FIXTURE"
  | "CROSS_TOURNAMENT_REFERENCE";

export type ScheduleLockConflictDiagnostic = {
  category: ScheduleLockConflictCategory;
  fixtureIds: string[];
  constraintId?: string;
  message: string;
  context?: Record<string, unknown>;
};

export type ScheduleLockValidationResult =
  | { ok: true }
  | { ok: false; diagnostics: ScheduleLockConflictDiagnostic[] };
