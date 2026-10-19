/**
 * SCE Tournament Planner 02 — programme architecture contracts (02A).
 *
 * Pure types/constants only — no persistence, generators, or UI.
 * Builds on Tournament Planner 01 (`smart-generator-architecture.ts`); does not replace it.
 */

/** Programme 02 evolves fixture+schedule planning toward full tournament programme generation. */
export const ADVANCED_TOURNAMENT_PROGRAMME_GENERATION = "CANONICAL_TARGET" as const;

/**
 * Canonical conceptual pipeline (02+).
 * Extends 01 fixture/schedule flow; 02D+ fills predefined templates on this spine.
 * Stations / in-round phases are not required TP02 delivery packages.
 */
export const TOURNAMENT_PROGRAMME_PIPELINE_STAGES = [
  "PARTICIPANTS",
  "PLAYING_FORMATS",
  "PLAYING_UNITS",
  "ROUNDS",
  "ASSIGNMENTS",
  "PITCHES",
  "TIMING",
  "SPIELPLAN",
] as const;

export type TournamentProgrammePipelineStage =
  (typeof TOURNAMENT_PROGRAMME_PIPELINE_STAGES)[number];

/** Tournament Planner 01 entities and engines remain authoritative for legacy and hybrid paths. */
export const TP01_EVOLUTION_NOT_REPLACEMENT = true;
export const ONE_CANONICAL_PROGRAMME = true;
export const TEAM_SPIELPLAN_DERIVED = true;
export const PARALLEL_SCHEDULE_TRUTH_CREATED = false;

/** Logical scheduler grid — tournament-owned; not FacilityResource (ADR-014, 01D-R1). */
export const TOURNAMENT_PITCH_IS_LOGICAL = true;
export const TOURNAMENT_PITCH_NEQ_FACILITY_RESOURCE = true;
export const MULTIPLE_LOGICAL_PITCHES_PER_PHYSICAL_RESOURCE_FUTURE_READY = true;

/**
 * Playing format primary semantic: players per side (not hard-coded THREE_V_THREE enums).
 * Display labels such as "3v3" are derived metadata.
 */
export const PLAYING_FORMAT_GENERIC = true;
export const PLAYING_FORMAT_HARD_CODED_SWISS_ENUM = false;
export const PLAYING_FORMAT_HARD_CODED_3V3_6V6_ENUM = false;
export const ARBITRARY_PLAYERS_PER_SIDE_PRESET_ONLY = false;

/** Permanent product rule: PlayingFormat is optional on TournamentPitch unless a selected programme format requires it. */
export const PLAYING_FORMAT_OPTIONAL_BY_DEFAULT = true;
export const PLAYING_FORMAT_REQUIRED_GLOBALLY = false;
export const UNSPECIFIED_PLAYING_FORMAT_VALID = true;
export const DEFAULT_PLAYING_FORMAT_ASSIGNED = false;
export const SILENT_FORMAT_INFERENCE = false;
export const NORMAL_TOURNAMENT_FORMAT_REQUIRED = false;
export const LEGACY_TOURNAMENT_FORMAT_REQUIRED = false;
/** Future ROTATION (etc.) may require format on relevant pitches — not RR/Smart Mix/Groups/KO by default. */
export const ADVANCED_FORMAT_MAY_REQUIRE_PLAYING_FORMAT = true;

/**
 * Defensive technical validation band for user-defined formats (02B persistence + UI).
 * Not a sporting/business product maximum — 02B may revise bounds or strategy.
 */
export const PLAYERS_PER_SIDE_MIN = 1;
export const PLAYERS_PER_SIDE_MAX = 22;
export const PLAYERS_PER_SIDE_TECHNICAL_BOUND_MIN = PLAYERS_PER_SIDE_MIN;
export const PLAYERS_PER_SIDE_TECHNICAL_BOUND_MAX = PLAYERS_PER_SIDE_MAX;
/** No fixed product cap in 02A — federation/sport limits belong in presets or format-specific rules. */
export const PLAYERS_PER_SIDE_PRODUCT_MAX: null = null;
export const TECHNICAL_BOUND_IS_PRODUCT_RULE = false;
export const PLAYERS_PER_SIDE_BOUND_REVIEW_DEFERRED_TO_02B = false;
/** See validate-tournament-pitch-playing-format.ts — defensive only, not product max. */
export const PLAYERS_PER_SIDE_TECHNICAL_BOUND_JUSTIFICATION =
  "Defensive integer band (1–22) for user-entered playersPerSide; not a sporting/business maximum.";

export type PlayingFormatSpecificationState = "UNSPECIFIED" | "SPECIFIED";

/** Display metadata vs scheduling/capacity semantics are distinct layers (02A contract). */
export interface PlayingFormatDisplayContract {
  /** Derived default: `${n}v${n}` — optional override for locale/preset copy only. */
  displayLabelOverride?: string;
}

export interface PlayingFormatSchedulingContract {
  playersPerSide: number;
}

export interface PlayingFormatContract {
  specification: PlayingFormatSpecificationState;
  scheduling?: PlayingFormatSchedulingContract;
  display?: PlayingFormatDisplayContract;
}

/** Legacy / Round Robin / Smart Mix tournaments may omit explicit playing format (02B default). */
export const UNSPECIFIED_PLAYING_FORMAT_BACKWARD_COMPATIBLE = true;
export const PLAYING_FORMAT_REQUIRED_FOR_LEGACY_TOURNAMENTS = false;
export const EXISTING_TOURNAMENTS_VALID = true;

/** Future: each TournamentPitch may reference a PlayingFormat (02B). */
export const TOURNAMENT_PITCH_PLAYING_FORMAT_RELATIONSHIP_DEFINED = true;

export function formatPlayersPerSideDisplayLabel(playersPerSide: number): string {
  return `${playersPerSide}v${playersPerSide}`;
}

export function isPlayersPerSideInValidationBand(playersPerSide: number): boolean {
  return (
    Number.isInteger(playersPerSide) &&
    playersPerSide >= PLAYERS_PER_SIDE_MIN &&
    playersPerSide <= PLAYERS_PER_SIDE_MAX
  );
}

/** Tournament-level registered identity (01). */
export const PARTICIPANT_NEQ_PLAYING_UNIT = true;

/** Future playing unit kinds (02C) — not persisted in 02A. */
export type TournamentParticipantUnitKind = "FULL_TEAM" | "SUBTEAM";

export interface TournamentParticipantUnitContract {
  unitId: string;
  parentParticipantId: string;
  kind: TournamentParticipantUnitKind;
  /** Stable label within parent, e.g. "E1", "E1-1". */
  label: string;
}

/**
 * Parent capacity: subteams may play simultaneously; full team + subteam normally must not
 * (same parent capacity consumed).
 */
export interface ParentParticipantCapacityRule {
  parentParticipantId: string;
  /** Units that may not be scheduled concurrently by default. */
  mutuallyExclusiveUnitIds: readonly string[];
}

export const PARENT_CAPACITY_CONTRACT_DEFINED = true;
export const FULL_TEAM_FUTURE_READY = true;
export const SUBTEAM_FUTURE_READY = true;

/** 02C — persisted tournament-local playing units + capacity overlap primitive. */
export const PLAYING_UNITS_PERSISTENCE_IMPLEMENTED = true;
export const PLAYING_UNIT_TOURNAMENT_LOCAL = true;
export const PARTICIPANT_UNIT_CAPACITY_OVERLAP_IMPLEMENTED = true;
export const IMPLICIT_FULL_TEAM_PLAYING_UNIT_COMPATIBILITY = true;
export const EXISTING_TOURNAMENTS_REQUIRE_UNIT_SETUP = false;
export const PLAYING_UNIT_FIXTURE_REFERENCE_IMPLEMENTED = false;
export const PLAYING_UNIT_ASSIGNMENT_REFERENCE_IMPLEMENTED = false;
export const PLAYING_UNIT_FIXTURE_REFERENCE_DEFERRED_TO_02D = true;

/** ROTATION is a first-class programme format — not a Smart Mix variant. */
export const ROTATION_FIRST_CLASS_FUTURE_FORMAT = true;
export const ROTATION_FORCED_INTO_SMART_MIX = false;
export const ROTATION_GENERATOR_IMPLEMENTED = false;

export type AdvancedProgrammeCompetitionFormat = "ROTATION";

/** Coexists with 01 group/mix/knockout modes; curated rotation programmes use 02D templates. */
export const ROTATION_COEXISTS_WITH_ROUND_ROBIN = true;
export const ROTATION_COEXISTS_WITH_SMART_MIX = true;
export const ROTATION_COEXISTS_WITH_GROUPS = true;
export const ROTATION_COEXISTS_WITH_KNOCKOUT = true;

/** Programme assignment kinds beyond ordinary fixtures (optional future — not required for TP02). */
export type TournamentProgrammeAssignmentKind =
  | "MATCH"
  | "ALTERNATIVE_ACTIVITY"
  | "REST_IDLE";

/**
 * Evolutionary schedule truth (02A):
 * - MATCH continues to bind `TournamentFixture` via `TournamentFixtureAssignment` (01).
 * - Non-fixture rows attach to the same `TournamentScheduleVersion` as programme assignments (future).
 */
export interface TournamentProgrammeAssignmentContract {
  kind: TournamentProgrammeAssignmentKind;
  scheduleVersionId: string;
  roundIndex: number;
  /** Present when kind === MATCH — references existing fixture row. */
  fixtureId?: string;
  /** Future: playing unit ids for rotation rows. */
  playingUnitIds?: readonly string[];
  /** Match rows: tournamentPitchId; alt/rest: tournamentStationId (optional future). */
  tournamentPitchId?: string;
  tournamentStationId?: string;
  startAtUtcMs?: number;
  endAtUtcMs?: number;
}

export const FIXTURE_PROGRAMME_ASSIGNMENT_RELATIONSHIP_DEFINED = true;
export const NON_FIXTURE_ASSIGNMENTS_FUTURE_READY = true;

/** Optional future station types — TournamentPitch stays canonical for match pitches. */
export type TournamentStationKind =
  | "MATCH_PITCH"
  | "ALTERNATIVE_ACTIVITY"
  | "REST_IDLE";

export interface TournamentStationContract {
  stationId: string;
  kind: TournamentStationKind;
  label: string;
  /** When kind === MATCH_PITCH, links to logical TournamentPitch. */
  tournamentPitchId?: string;
}

export const TOURNAMENT_STATION_CONTRACT_DEFINED = true;
export const TOURNAMENT_STATION_PERSISTENCE_IMPLEMENTED = false;

/** Programme round may mix formats, pitches, stations, idle (generic — not Swiss-specific). */
export interface TournamentProgrammeRoundContract {
  roundIndex: number;
  label?: string;
  assignmentIds: readonly string[];
}

export const ROUND_MODEL_DEFINED = true;

/** Distinct timing concepts — must not be merged; TP02 reuses 01 timing (no in-round phase package). */
export const TIMING_CONCEPTS = [
  "TOURNAMENT_WINDOW",
  "ROUND_DURATION",
  "IN_ROUND_PHASE",
  "MATCH_DURATION",
  "TRANSITION_DURATION",
  "TEAM_REST",
  "TOURNAMENT_BREAK",
] as const;

export type TournamentTimingConcept = (typeof TIMING_CONCEPTS)[number];

export const IN_ROUND_PHASE_CONTRACT_DEFINED = true;
export const IN_ROUND_PHASE_IMPLEMENTED = false;
export const TIMING_CONCEPTS_REMAIN_DISTINCT = true;

/** Soft fairness dimensions (optional future) — hard constraints always win; not required for TP02. */
export const FAIRNESS_OPTIMISATION_DIMENSIONS = [
  "TOTAL_MATCH_COUNT",
  "PLAYING_TIME",
  "OPPONENT_DIVERSITY",
  "REMATCH_DISTRIBUTION",
  "REST_IDLE_DISTRIBUTION",
  "ALTERNATIVE_ACTIVITY_DISTRIBUTION",
  "PLAYING_FORMAT_EXPOSURE",
  "TOURNAMENT_PITCH_EXPOSURE",
  "PITCH_SWITCHING",
  "FIRST_LAST_ROUND_FAIRNESS",
  "TEMPORAL_DISTRIBUTION",
] as const;

export type FairnessOptimisationDimension =
  (typeof FAIRNESS_OPTIMISATION_DIMENSIONS)[number];

export const HARD_CONSTRAINTS_DOMINATE_FAIRNESS = true;
export const HEURISTIC_FAILURE_NEQ_INFEASIBLE = true;
export const ADVANCED_FAIRNESS_OPTIMISER_IMPLEMENTED = false;

/** Generic engine vs optional federation/country presets (templates sit above engine). */
export const GENERIC_ENGINE_LAYER = "TOURNAMENT_PROGRAMME_ENGINE" as const;
export const FEDERATION_PRESETS_LAYER = "OPTIONAL_TEMPLATES_ABOVE_ENGINE" as const;
export const SFV_SPECIFIC_TYPES_IN_CORE_DOMAIN = false;

/** Active TP02 package map (02A–02E). Former 02D rotation generator / 02E–02G scope removed from delivery. */
export const TOURNAMENT_PLANNER_02_PACKAGES = {
  "02A": "Programme architecture & format model",
  "02B":
    "Playing formats & tournament pitches — optional pitch PlayingFormat, playersPerSide persistence, no mandatory format for normal tournaments, no default/silent inference, format-specific validation only when semantically required, Creator/Planung adoption",
  "02C": "Participant playing units",
  "02D": "Predefined Spielplan templates & instant generation",
  "02E": "Spielplan UX, outputs & final hardening",
} as const;

export type TournamentPlanner02PackageId = keyof typeof TOURNAMENT_PLANNER_02_PACKAGES;

export const TOURNAMENT_PLANNER_02C_STATUS = "READY_FOR_PO_UAT" as const;

export const TOURNAMENT_PLANNER_02_NEXT_PACKAGE_ID = "02D" as const;
export const TOURNAMENT_PLANNER_02_NEXT_PACKAGE_LABEL =
  "Predefined Spielplan templates & instant generation" as const;

export const TOURNAMENT_PLANNER_02_FINAL_PACKAGE_ID = "02E" as const;
export const TOURNAMENT_PLANNER_02_FINAL_PACKAGE_LABEL =
  "Spielplan UX, outputs & final hardening" as const;

export const TOURNAMENT_PLANNER_02_CLOSES_AFTER_PACKAGE_ID = "02E" as const;

/** Remaining required work to close Tournament Planner 02. */
export const TOURNAMENT_PLANNER_02_REMAINING_REQUIRED_PACKAGES = [
  "02D",
  "02E",
] as const satisfies readonly TournamentPlanner02PackageId[];

export const GENERIC_ROTATION_GENERATOR_REQUIRED_FOR_TP02 = false;
export const STATIONS_ALTERNATIVE_ACTIVITIES_REQUIRED_FOR_TP02 = false;
export const ADVANCED_TIMING_IN_ROUND_PHASES_REQUIRED_FOR_TP02 = false;
export const FAIR_PROGRAMME_OPTIMISER_REQUIRED_FOR_TP02 = false;

export const TEMPLATE_DRIVEN_SPIELPLAN_GENERATION = true;
export const PARTICIPANT_COUNT_SELECTS_PREDEFINED_TEMPLATE = true;
export const PREDEFINED_TEMPLATE_DEFINES_FIELD_COUNT = true;
/** Initial curated template target band — not a hard product maximum participant count. */
export const PREDEFINED_TEMPLATE_INITIAL_CURATED_PARTICIPANT_MIN = 4;
export const PREDEFINED_TEMPLATE_INITIAL_CURATED_PARTICIPANT_MAX = 16;
export const TOURNAMENT_PARTICIPANT_PRODUCT_MAX: null = null;

export const TOURNAMENT_PLANNER_01_BACKWARD_COMPATIBLE = true;
export const TP01_GENERATORS_PRESERVED = true;
export const TP01_SCHEDULER_PRESERVED = true;
export const TP01_OUTPUTS_PRESERVED = true;

/** Creator adoption flags — 02B implements pitch PlayingFormat UI + persistence. */
export const TOURNAMENT_CREATOR_ADOPTION_REQUIRED_02B = true;
export const TOURNAMENT_PLANUNG_ADOPTION_REQUIRED_02B = true;
export const SPIELPLAN_OUTPUT_ADOPTION_REQUIRED_02B = true;
