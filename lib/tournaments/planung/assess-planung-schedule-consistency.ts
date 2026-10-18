/**
 * Determines whether persisted fixture assignments still match operational timing config.
 * Does not mutate assignments or regenerate the schedule.
 */

import {
  buildBlockedIntervalsByPitchId,
  slotOverlapsPitchBreak,
} from "@/lib/tournament-scheduling/feasibility/break-intervals";
import type {
  FeasibilityInstantWindow,
  FeasibilitySchedulingConfig,
  FeasibilityTournamentBreakRef,
  FeasibilityTournamentPitchRef,
} from "@/lib/tournament-scheduling/feasibility/types";
import { persistedAssignmentToScheduleAssignment } from "@/lib/tournament-scheduling/manual-assignment";
import { validateTournamentManualAssignment } from "@/lib/tournament-scheduling/manual-assignment/validate-tournament-manual-assignment";
import type { TournamentFixtureScheduleAssignment } from "@/lib/tournament-scheduling/schedule-optimiser/types";
import type { ResolvedFixtureDependency } from "@/lib/tournament-scheduling/schedule-optimiser/dependencies";
import type { FeasibilityFixtureRef } from "@/lib/tournament-scheduling/feasibility/types";
import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";

export type PlanungScheduleConsistencyStatus = "MATCHES" | "NEEDS_REGENERATION";

export type PlanungScheduleConsistencyInput = {
  tournamentWindow: FeasibilityInstantWindow;
  config: FeasibilitySchedulingConfig;
  fixtures: readonly FeasibilityFixtureRef[];
  assignments: readonly {
    fixtureId: string;
    tournamentPitchId: string;
    startAt: string;
    endAt: string;
    scheduleLockDimension: TournamentFixtureScheduleLockDimension | null;
  }[];
  pitches: readonly FeasibilityTournamentPitchRef[];
  breaks: readonly FeasibilityTournamentBreakRef[];
  dependencies: Map<string, ResolvedFixtureDependency[]>;
};

const END_MS_TOLERANCE = 2_000;

export function assessPlanungScheduleConsistency(
  input: PlanungScheduleConsistencyInput,
): PlanungScheduleConsistencyStatus {
  if (input.assignments.length === 0) {
    return "MATCHES";
  }

  const matchMs = input.config.matchDurationMinutes * 60_000;
  for (const row of input.assignments) {
    const startMs = Date.parse(row.startAt);
    const endMs = Date.parse(row.endAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return "NEEDS_REGENERATION";
    }
    if (Math.abs(endMs - startMs - matchMs) > END_MS_TOLERANCE) {
      return "NEEDS_REGENERATION";
    }
  }

  const scheduleAssignments: TournamentFixtureScheduleAssignment[] = input.assignments.map((a) =>
    persistedAssignmentToScheduleAssignment(
      {
        fixtureId: a.fixtureId,
        tournamentPitchId: a.tournamentPitchId,
        startAt: a.startAt,
      },
      input.config,
    ),
  );

  const blockedByPitch = buildBlockedIntervalsByPitchId({
    breaks: input.breaks,
    pitches: input.pitches,
    tournamentWindow: input.tournamentWindow,
  });

  for (const slot of scheduleAssignments) {
    if (slotOverlapsPitchBreak(slot, blockedByPitch)) {
      return "NEEDS_REGENERATION";
    }
  }

  for (const row of input.assignments) {
    const startMs = Date.parse(row.startAt);
    const ctx = {
      tournamentWindow: input.tournamentWindow,
      config: input.config,
      fixtures: input.fixtures,
      assignments: scheduleAssignments,
      pitches: input.pitches,
      breaks: input.breaks,
      dependencies: input.dependencies,
      movingFixtureId: row.fixtureId,
      targetTournamentPitchId: row.tournamentPitchId,
      targetStartUtcMs: startMs,
      lockDimension: row.scheduleLockDimension,
    };
    const result = validateTournamentManualAssignment(ctx);
    if (!result.ok) {
      return "NEEDS_REGENERATION";
    }
  }

  return "MATCHES";
}
