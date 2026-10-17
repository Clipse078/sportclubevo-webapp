import type { TournamentFeasibilityStatus } from "../feasibility";
import type {
  FeasibilityAssignmentRef,
  FeasibilityFixtureRef,
  FeasibilityInstantWindow,
  FeasibilityMetrics,
  FeasibilityParticipantRef,
  FeasibilitySchedulingConfig,
  FeasibilityTournamentBreakRef,
  FeasibilityTournamentPitchRef,
} from "../feasibility/types";

export type TournamentTimingMode = "FORWARD" | "BACKWARD" | "FIXED_ASSESSMENT";

export type ParticipantRestProofStatus = "PROVEN" | "UNRESOLVED" | "PARTIAL";

export type RequiredSpanKind = "EXACT_WITNESS" | "STRUCTURAL_LOWER_BOUND";

export type TimingFixtureSideSource = {
  side: "A" | "B";
  sourceType: "CONCRETE_PARTICIPANT" | "QUALIFICATION_REFERENCE" | "WINNER_OF_FIXTURE";
  participantId: string | null;
};

/** Generator-agnostic fixture ref; may carry unresolved qualification / progression sides. */
export type TournamentTimingFixtureRef = FeasibilityFixtureRef & {
  sideSources?: readonly TimingFixtureSideSource[];
};

export type TournamentTimingInput = {
  mode: TournamentTimingMode;
  tournamentWindow: FeasibilityInstantWindow;
  /** Required for FORWARD / FIXED; optional hint only — not mutated by the advisor. */
  config: FeasibilitySchedulingConfig;
  fixtures: readonly TournamentTimingFixtureRef[];
  participants: readonly FeasibilityParticipantRef[];
  tournamentPitches: readonly Pick<
    FeasibilityTournamentPitchRef,
    "tournamentPitchId" | "displayOrder" | "label"
  >[];
  breaks: readonly FeasibilityTournamentBreakRef[];
  lockedAssignments?: readonly FeasibilityAssignmentRef[];
  /**
   * FORWARD mode: when false, end instant is not treated as an organiser-fixed boundary
   * (predicted finish only). Default true.
   */
  endBoundaryKnown?: boolean;
};

export type TimingDurationRecommendation = {
  matchDurationMinutes: number;
  transitionMinutes: number;
  /** Human-readable deterministic rationale (not UI copy). */
  rationale: string;
};

export type MinRestRecommendationKind =
  | "OPERATIONALLY_RECOMMENDED"
  | "MATHEMATICAL_BOUND";

export type TimingMinRestRecommendation = {
  minRestMinutes: number;
  kind: MinRestRecommendationKind;
  mathematicalMinimumMinutes: number;
  rationale: string;
};

export type TimingAdjustmentCode =
  | "ADD_TOURNAMENT_PITCH"
  | "EXTEND_TOURNAMENT_END"
  | "REDUCE_MATCH_DURATION"
  | "REDUCE_TRANSITION_DURATION"
  | "REDUCE_MINIMUM_REST"
  | "REDUCE_OR_MOVE_BREAK";

export type TimingAdjustmentOption = {
  code: TimingAdjustmentCode;
  context?: Readonly<Record<string, string | number | boolean>>;
};

export type TimingNudgeCode =
  | "TIME_WINDOW_TIGHT"
  | "EXTEND_END_TIME"
  | "REDUCE_MATCH_DURATION"
  | "REDUCE_TRANSITION_DURATION"
  | "ADD_TOURNAMENT_PITCH"
  | "BREAK_REDUCES_CAPACITY"
  | "MINIMUM_REST_CONSTRAINT"
  | "UNRESOLVED_PARTICIPANT_REST"
  | "RESERVE_REMAINS"
  | "LONGER_MATCHES_POSSIBLE"
  | "BREAK_COULD_FIT"
  | "PITCH_COULD_BE_REMOVED";

export type TimingNudge = {
  code: TimingNudgeCode;
  polarity: "CORRECTIVE" | "POSITIVE";
  context?: Readonly<Record<string, string | number | boolean>>;
};

export type PitchCountRecommendation = {
  minimumProvenPitchCount: number | null;
  currentPitchCount: number;
  rationale: string;
};

export type MatchDurationOpportunity = {
  additionalMatchMinutes: number;
  recommendedMatchDurationMinutes: number;
  rationale: string;
} | null;

export type BreakOpportunity = {
  suggestedDurationMinutes: number;
  rationale: string;
} | null;

export type TournamentTimingAssessment = {
  mode: TournamentTimingMode;
  feasibilityStatus: TournamentFeasibilityStatus;
  participantRestProofStatus: ParticipantRestProofStatus;
  metrics: FeasibilityMetrics;
  /** Effective playable pitch-minute capacity after breaks. */
  effectivePlayableCapacityMinutes: number;
  requiredSpanMinutes: number;
  requiredSpanKind: RequiredSpanKind;
  predictedFinishUtcMs: number | null;
  reserveMinutes: number | null;
  /** Operational (practical-grid) backward recommendation — never auto-applied. */
  durationRecommendation: TimingDurationRecommendation | null;
  /**
   * Tightest integer-minute slot packing verified by 01D (BACKWARD mode).
   * Distinct from operational recommendation when zero-transition utilisation wins mathematically.
   */
  mathematicalMaximumTiming: TimingDurationRecommendation | null;
  /** Operational vs mathematical minimum rest — never auto-applied. */
  minRestRecommendation: TimingMinRestRecommendation | null;
  /** Suggestions only — never auto-applied to tournament configuration. */
  recommendationsAutoApplied: false;
  adjustments: TimingAdjustmentOption[];
  nudges: TimingNudge[];
  pitchCountRecommendation: PitchCountRecommendation;
  matchDurationOpportunity: MatchDurationOpportunity;
  breakOpportunity: BreakOpportunity;
  diagnostics: import("../feasibility/types").FeasibilityDiagnostic[];
};
