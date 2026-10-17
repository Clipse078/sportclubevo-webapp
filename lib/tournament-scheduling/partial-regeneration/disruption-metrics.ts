import type { TournamentFixtureScheduleAssignment } from "../schedule-optimiser/types";
import type { ResolvedFixtureScheduleLock } from "../schedule-lock/normalize";
import { compareScheduleObjectiveMetrics } from "../schedule-optimiser/objective-metrics";
import type { ScheduleObjectiveMetrics } from "../schedule-optimiser/types";
import type { RegenerationChangeMetrics } from "./types";

export type { RegenerationChangeMetrics } from "./types";

export function computeRegenerationChangeMetrics(params: {
  baselineAssignments: readonly TournamentFixtureScheduleAssignment[];
  resultAssignments: readonly TournamentFixtureScheduleAssignment[];
  resolvedLocks: readonly ResolvedFixtureScheduleLock[];
}): RegenerationChangeMetrics {
  const lockByFixture = new Map(params.resolvedLocks.map((l) => [l.fixtureId, l]));
  const baselineById = new Map(params.baselineAssignments.map((a) => [a.fixtureId, a]));
  const resultById = new Map(params.resultAssignments.map((a) => [a.fixtureId, a]));

  let fixturesMovedInTime = 0;
  let fixturesMovedInPitch = 0;
  let fixturesMovedInBoth = 0;
  let totalTimeDisplacementMinutes = 0;
  let unchangedFixtureCount = 0;

  for (const [fixtureId, baseline] of baselineById) {
    const lock = lockByFixture.get(fixtureId);
    if (lock?.dimension === "TIME_AND_PITCH") {
      unchangedFixtureCount += 1;
      continue;
    }
    const result = resultById.get(fixtureId);
    if (!result) continue;

    const timeChanged = result.startUtcMs !== baseline.startUtcMs;
    const pitchChanged = result.tournamentPitchId !== baseline.tournamentPitchId;
    if (lock?.dimension === "TIME") {
      if (pitchChanged) fixturesMovedInPitch += 1;
    } else if (lock?.dimension === "PITCH") {
      if (timeChanged) {
        fixturesMovedInTime += 1;
        totalTimeDisplacementMinutes += Math.abs(result.startUtcMs - baseline.startUtcMs) / 60_000;
      }
    } else if (timeChanged && pitchChanged) {
      fixturesMovedInBoth += 1;
      totalTimeDisplacementMinutes += Math.abs(result.startUtcMs - baseline.startUtcMs) / 60_000;
    } else if (timeChanged) {
      fixturesMovedInTime += 1;
      totalTimeDisplacementMinutes += Math.abs(result.startUtcMs - baseline.startUtcMs) / 60_000;
    } else if (pitchChanged) {
      fixturesMovedInPitch += 1;
    } else {
      unchangedFixtureCount += 1;
    }
  }

  return {
    fixturesMovedInTime,
    fixturesMovedInPitch,
    fixturesMovedInBoth,
    totalTimeDisplacementMinutes,
    unchangedFixtureCount,
  };
}

export type RegenerationObjectiveBundle = {
  changeMetrics: RegenerationChangeMetrics;
  scheduleObjectiveMetrics: ScheduleObjectiveMetrics;
};

/** Lex order: hard constraints assumed satisfied; then minimal disruption; then 01F2 objectives. */
export function compareRegenerationObjectiveBundles(
  a: RegenerationObjectiveBundle,
  b: RegenerationObjectiveBundle,
): number {
  const disruptionOrder: (keyof RegenerationChangeMetrics)[] = [
    "fixturesMovedInBoth",
    "fixturesMovedInTime",
    "fixturesMovedInPitch",
    "totalTimeDisplacementMinutes",
    "unchangedFixtureCount",
  ];
  for (const key of disruptionOrder) {
    const av = a.changeMetrics[key];
    const bv = b.changeMetrics[key];
    if (key === "unchangedFixtureCount") {
      if (av !== bv) return bv - av;
    } else if (av !== bv) {
      return av - bv;
    }
  }
  return compareScheduleObjectiveMetrics(
    a.scheduleObjectiveMetrics,
    b.scheduleObjectiveMetrics,
  );
}

export function bundleFromState(params: {
  state: import("../feasibility/complete-search").FeasibilitySearchState;
  baselineAssignments: readonly TournamentFixtureScheduleAssignment[];
  resolvedLocks: readonly ResolvedFixtureScheduleLock[];
  scheduleObjectiveMetrics: ScheduleObjectiveMetrics;
}): RegenerationObjectiveBundle {
  const resultAssignments = [...params.state.assignments.entries()]
    .sort((x, y) => x[1].startUtcMs - y[1].startUtcMs || x[0].localeCompare(y[0]))
    .map(([fixtureId, slot]) => ({
      fixtureId,
      tournamentPitchId: slot.tournamentPitchId,
      startUtcMs: slot.startUtcMs,
      endUtcMs: slot.participantEndUtcMs,
      resourceEndUtcMs: slot.resourceEndUtcMs,
    }));
  return {
    changeMetrics: computeRegenerationChangeMetrics({
      baselineAssignments: params.baselineAssignments,
      resultAssignments,
      resolvedLocks: params.resolvedLocks,
    }),
    scheduleObjectiveMetrics: params.scheduleObjectiveMetrics,
  };
}
