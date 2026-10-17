/**
 * SCE-TOURNAMENT-PLANNER-01I — manual schedule adjustment (WHEN + TournamentPitch only).
 */

import type { ScheduleLockConflictDiagnostic } from "../schedule-lock/types";
import type { TournamentFixtureScheduleAssignment } from "../schedule-optimiser/types";
import type { FeasibilitySchedulingConfig, FeasibilityInstantWindow } from "../feasibility/types";
import type { FeasibilityFixtureRef } from "../feasibility/types";
import type { ResolvedFixtureDependency } from "../schedule-optimiser/dependencies";
import type { FeasibilityTournamentBreakRef, FeasibilityTournamentPitchRef } from "../feasibility/types";
import type { TournamentFixtureScheduleLockDimension } from "../schedule-lock/types";

export type TournamentManualAssignmentInput = {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId: string;
  fixtureId: string;
  expectedRevision: number;
  targetTournamentPitchId: string;
  /** ISO instant — must align to Planung board row anchor (01H time scale). */
  targetStartAt: string;
};

export type TournamentManualAssignmentValidationContext = {
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  fixtures: readonly FeasibilityFixtureRef[];
  assignments: readonly TournamentFixtureScheduleAssignment[];
  pitches: readonly FeasibilityTournamentPitchRef[];
  breaks: readonly FeasibilityTournamentBreakRef[];
  dependencies: Map<string, ResolvedFixtureDependency[]>;
  movingFixtureId: string;
  targetTournamentPitchId: string;
  targetStartUtcMs: number;
  lockDimension: TournamentFixtureScheduleLockDimension | null;
  participantDisplayNames?: ReadonlyMap<string, string>;
  pitchLabels?: ReadonlyMap<string, string>;
};

export type TournamentManualAssignmentValidationResult =
  | { ok: true; slot: TournamentFixtureScheduleAssignment }
  | { ok: false; diagnostics: ScheduleLockConflictDiagnostic[] };

export type TournamentManualAssignmentApplyResult = {
  revision: number;
  assignmentId: string;
  userMessage: string;
};
