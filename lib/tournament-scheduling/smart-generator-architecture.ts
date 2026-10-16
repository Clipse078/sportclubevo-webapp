/**
 * SCE Smart Tournament Generator — canonical architecture contracts (01D-R2).
 *
 * Pure types/constants only — no generation, feasibility, or scheduling logic.
 * Binds future fixture generators, feasibility (01D), and optimiser (01E).
 */

/** Product cardinality — not MVP engine safety limits. */
export const PARTICIPANT_PRODUCT_CARDINALITY = "2:n" as const;
export const TOURNAMENT_PITCH_CARDINALITY = "1:n" as const;
export const TOURNAMENT_BREAK_CARDINALITY = "0:n" as const;
export const TOURNAMENT_PHASE_CARDINALITY = "1:n" as const;

export const SMART_TOURNAMENT_GENERATOR = "CANONICAL" as const;
export const AUTOMATIC_GENERATION_IS_PRIMARY = true;
export const MANUAL_ADJUSTMENT_IS_SUPPORTED = true;

/** User-facing competition modes (one tournament may contain 1:n phases). */
export type TournamentCompetitionMode =
  | "GROUP_MIX_ONLY"
  | "KNOCKOUT_ONLY"
  | "GROUP_PLUS_KNOCKOUT";

export const COMPETITION_MODES: readonly TournamentCompetitionMode[] = [
  "GROUP_MIX_ONLY",
  "KNOCKOUT_ONLY",
  "GROUP_PLUS_KNOCKOUT",
] as const;

/** Fixture-generation strategies for group/mix phases. */
export type GroupMixGenerationStrategy = "ROUND_ROBIN" | "SMART_MIX";

export const GROUP_MIX_GENERATORS: readonly GroupMixGenerationStrategy[] = [
  "ROUND_ROBIN",
  "SMART_MIX",
] as const;

/** 01C MVP implements single round-robin only; product allows 1:n meetings. */
export const CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT = 1;
export const PRODUCT_ROUND_ROBIN_MEETINGS_PER_OPPONENT = "1:n" as const;
export const ROUND_ROBIN_EXTENSION_REQUIRED = true;

/** Explicit generation setting — side A/B stay neutral when OFF. */
export type HomeAwayRelevance = "ON" | "OFF";

export const HOME_AWAY_DEFAULT_FOR_NEUTRAL_YOUTH_TOURNAMENT: HomeAwayRelevance = "OFF";

/** Logical phase identity — persisted `TournamentPhase` table deferred until Group+KO package. */
export type TournamentPhaseKind = "GROUP_STAGE" | "KNOCKOUT" | "MIX";

export interface TournamentPhaseContract {
  /** Stable within tournament; maps to `TournamentFixture.stageKey` today. */
  stageKey: string;
  kind: TournamentPhaseKind;
  /** Which generator semantics apply in this phase. */
  groupMixStrategy?: GroupMixGenerationStrategy;
  /** Future: sequential vs overlapping phase scheduling. */
  schedulingBoundary?: "SEQUENTIAL" | "MAY_OVERLAP";
}

/**
 * Future fixture-side resolution (knockout qualification).
 * Current persistence uses concrete `sideAParticipantId` / `sideBParticipantId` only.
 */
export type FixtureSideSourceKind = "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE";

export type QualificationReferenceKind =
  | "GROUP_POSITION"
  | "WINNER_OF_FIXTURE"
  | "LOSER_OF_FIXTURE";

export interface QualificationReference {
  kind: QualificationReferenceKind;
  /** e.g. GROUP_A + position 1 */
  groupKey?: string;
  position?: number;
  /** Correlates to TournamentFixture.id or generatorKey */
  sourceFixtureId?: string;
}

export interface FixtureSideSourceContract {
  kind: FixtureSideSourceKind;
  participantId?: string;
  qualification?: QualificationReference;
}

export const FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED = true;

/** Feasibility operates on any valid concrete-participant fixture set. */
export const FEASIBILITY_REQUIRES_ROUND_ROBIN_SOURCE = false;

/** 01C / feasibility MVP guards — not product limits. */
export const CURRENT_MVP_PARTICIPANT_LIMIT = 16;
export const PARTICIPANT_LIMIT_IS_PRODUCT_RULE = false;
export const PARTICIPANT_LIMIT_REQUALIFICATION_RECORDED = true;

/**
 * Canonical generation pipeline (binding for future packages).
 *
 * TournamentParticipants → CompetitionStructure → TournamentPhases →
 * FixtureGenerator → TournamentFixtures → 01D Feasibility → 01E ScheduleOptimiser →
 * TournamentFixtureAssignments → ManualAdjustments/Locks → PartialRegeneration → Publication
 */
export const GENERATION_PIPELINE_STAGES = [
  "TOURNAMENT_PARTICIPANTS",
  "COMPETITION_STRUCTURE",
  "TOURNAMENT_PHASES",
  "FIXTURE_GENERATOR",
  "TOURNAMENT_FIXTURES",
  "FEASIBILITY_01D",
  "SCHEDULE_OPTIMISER_01E",
  "TOURNAMENT_FIXTURE_ASSIGNMENTS",
  "MANUAL_ADJUSTMENTS_AND_LOCKS",
  "PARTIAL_REGENERATION",
  "PUBLICATION",
] as const;

/** Future hard constraint: dependent knockout fixtures after prerequisites + rest. */
export const KNOCKOUT_DEPENDENCY_CONSTRAINT_RECORDED = true;

/** Future Group+KO depends on canonical ranking output before qualification resolution. */
export const GROUP_RANKING_RULES_DEPENDENCY_RECORDED = true;
