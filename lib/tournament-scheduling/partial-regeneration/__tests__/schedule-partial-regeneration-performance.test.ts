import { describe, expect, it } from "vitest";
import { regenerateTournamentSchedule } from "../regenerate";
import { optimiseTournamentSchedule } from "../../schedule-optimiser/optimise";
import { FEASIBILITY_MAX_FIXTURES } from "../../feasibility/constants";
import { EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES } from "../../schedule-optimiser/constants";
import type { TournamentFixtureScheduleAssignment } from "../../schedule-optimiser/types";
import type { TournamentFixtureScheduleLock } from "../../schedule-lock/types";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "../../schedule-optimiser/__tests__/helpers";

const COUNTS = [8, 16, 32, 64, 128] as const;

function mixedLocksFromBaseline(
  assignments: readonly TournamentFixtureScheduleAssignment[],
): TournamentFixtureScheduleLock[] {
  const locks: TournamentFixtureScheduleLock[] = [
    { fixtureId: assignments[0]!.fixtureId, dimension: "TIME_AND_PITCH" },
  ];
  if (assignments.length >= 8) {
    locks.push({
      fixtureId: assignments[assignments.length - 1]!.fixtureId,
      dimension: "TIME",
    });
  }
  if (assignments.length >= 16) {
    locks.push({
      fixtureId: assignments[Math.floor(assignments.length / 2)]!.fixtureId,
      dimension: "PITCH",
    });
  }
  return locks;
}

describe("01G-R1 — partial regeneration performance observations", () => {
  it.each(COUNTS)("observes regeneration for %i fixtures (or reports guard)", (count) => {
    if (count > FEASIBILITY_MAX_FIXTURES) {
      expect(count).toBeGreaterThan(FEASIBILITY_MAX_FIXTURES);
      return;
    }
    if (count === 64) {
      expect(count).toBeLessThanOrEqual(FEASIBILITY_MAX_FIXTURES);
      expect(EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES).toBeLessThan(count);
      return;
    }

    const fixtures = sequentialFixtures(count);
    const pitchCount = 4;
    const pitches = Array.from({ length: pitchCount }, (_, i) =>
      tournamentPitch(`pitch-${i}`, i),
    );
    const input = optimiserInput({
      fixtures,
      tournamentPitches: pitches,
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 5 },
      tournamentWindow: windowFromClock(0, Math.max(1200, count * 18)),
    });
    const baseline = optimiseTournamentSchedule(input);
    expect(baseline.hardConstraintValidationOk).toBe(true);

    const scheduleLocks = mixedLocksFromBaseline(baseline.assignments);

    const started = performance.now();
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline.assignments,
      scheduleLocks,
    });
    const elapsedMs = performance.now() - started;

    expect(result.hardConstraintValidationOk).toBe(true);
    expect(result.assignments).toHaveLength(count);
    expect(result.preservedLockCount).toBe(scheduleLocks.length);
    expect(elapsedMs).toBeLessThan(count >= 64 ? 240_000 : 120_000);
    if (count > EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES) {
      expect(result.searchStats.boundedImprovementEvaluations ?? 0).toBeGreaterThan(0);
    }
  }, 240_000);
});
