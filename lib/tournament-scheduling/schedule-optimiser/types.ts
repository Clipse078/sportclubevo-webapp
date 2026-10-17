import type {
  FeasibilityAssignmentRef,
  FeasibilityDiagnostic,
  FeasibilityMetrics,
  FeasibilitySchedulingConfig,
} from "../feasibility/types";
import type { TournamentFixtureScheduleLock } from "../schedule-lock/types";
import type { RegenerationChangeMetrics } from "../partial-regeneration/types";
import type { ScheduleLockConflictDiagnostic } from "../schedule-lock/types";
import type {
  ParticipantRestProofStatus,
  TimingFixtureSideSource,
  TournamentTimingFixtureRef,
  TournamentTimingInput,
} from "../smart-timing/types";
import type { ScheduleSoftObjectiveId } from "../smart-timing/soft-objectives";

export type TournamentScheduleOptimisationStatus =
  | "OPTIMAL"
  | "FEASIBLE_NOT_PROVEN_OPTIMAL"
  | "INFEASIBLE_PROVEN"
  | "UNRESOLVED";

export type ScheduleFixtureDependency =
  | { kind: "AFTER_FIXTURE_COMPLETE"; sourceFixtureId: string }
  | { kind: "AFTER_GROUP_STAGE_COMPLETE"; tournamentGroupId: string };

export type ScheduleOptimisationSideSource = TimingFixtureSideSource & {
  sourceFixtureId?: string | null;
  sourceGroupId?: string | null;
};

export type TournamentScheduleOptimisationFixtureRef = TournamentTimingFixtureRef & {
  sideSources?: readonly ScheduleOptimisationSideSource[];
  dependencies?: readonly ScheduleFixtureDependency[];
};

export type TournamentScheduleOptimisationInput = Omit<TournamentTimingInput, "mode" | "fixtures"> & {
  fixtures: readonly TournamentScheduleOptimisationFixtureRef[];
  /** When omitted, config is taken from input.config unchanged (no silent mutation). */
  config: FeasibilitySchedulingConfig;
  /** 01G — granular locks (TIME / PITCH / TIME_AND_PITCH). */
  scheduleLocks?: readonly TournamentFixtureScheduleLock[];
  /** 01G — current schedule used for partial-lock resolution and minimal-disruption objective. */
  baselineAssignments?: readonly TournamentFixtureScheduleAssignment[];
  /** @deprecated Prefer scheduleLocks TIME_AND_PITCH — full assignment locks for feasibility seed. */
  lockedAssignments?: readonly FeasibilityAssignmentRef[];
};

export type TournamentFixtureScheduleAssignment = {
  fixtureId: string;
  tournamentPitchId: string;
  startUtcMs: number;
  endUtcMs: number;
  resourceEndUtcMs: number;
};

export type ScheduleObjectiveMetrics = Partial<Record<ScheduleSoftObjectiveId, number>> & {
  tournamentSpanMinutes: number;
};

export type TournamentPartialRegenerationInput = TournamentScheduleOptimisationInput & {
  baselineAssignments: readonly TournamentFixtureScheduleAssignment[];
  scheduleLocks?: readonly TournamentFixtureScheduleLock[];
};

export type TournamentPartialRegenerationResult = TournamentScheduleOptimisationResult & {
  changeMetrics: RegenerationChangeMetrics | null;
  lockConflictDiagnostics: ScheduleLockConflictDiagnostic[];
  preservedLockCount: number;
};

export type TournamentScheduleOptimisationResult = {
  status: TournamentScheduleOptimisationStatus;
  participantRestProofStatus: ParticipantRestProofStatus;
  assignments: TournamentFixtureScheduleAssignment[];
  hardConstraintValidationOk: boolean;
  objectiveMetrics: ScheduleObjectiveMetrics | null;
  objectiveScore: ScheduleObjectiveMetrics | null;
  feasibilityMetrics: FeasibilityMetrics | null;
  diagnostics: FeasibilityDiagnostic[];
  baselineObjectiveMetrics: ScheduleObjectiveMetrics | null;
  changeMetrics?: RegenerationChangeMetrics | null;
  searchStats: {
    candidateSlotCount: number;
    completeAssignmentsExplored: number;
    nodesVisited: number;
    boundedImprovementPasses?: number;
    boundedImprovementEvaluations?: number;
    boundedImprovementAccepted?: number;
  };
  optimalityNote: string;
};
