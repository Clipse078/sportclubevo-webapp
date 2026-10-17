import { describe, expect, it } from "vitest";
import { regenerateTournamentSchedule } from "../regenerate";
import { optimiseTournamentSchedule } from "../../schedule-optimiser/optimise";
import { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock } from "../../schedule-optimiser/__tests__/helpers";

const COUNTS = [8] as const;

describe("01G — partial regeneration performance observations", () => {
  it.each(COUNTS)("regenerates %i fixtures with mixed locks", (count) => {
    const fixtures = sequentialFixtures(count);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [
        tournamentPitch("pitch-a", 0),
        tournamentPitch("pitch-b", 1),
        tournamentPitch("pitch-c", 2),
        tournamentPitch("pitch-d", 3),
      ],
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 5 },
      tournamentWindow: windowFromClock(0, 800),
    });
    const baseline = optimiseTournamentSchedule(input);
    expect(baseline.hardConstraintValidationOk).toBe(true);
    const scheduleLocks = [
      { fixtureId: baseline.assignments[0]!.fixtureId, dimension: "TIME" as const },
      { fixtureId: baseline.assignments[1]!.fixtureId, dimension: "PITCH" as const },
      ...(baseline.assignments[2]
        ? [{ fixtureId: baseline.assignments[2]!.fixtureId, dimension: "TIME_AND_PITCH" as const }]
        : []),
    ];

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
    expect(elapsedMs).toBeLessThan(120_000);
    expect(result.searchStats.boundedImprovementEvaluations ?? 0).toBeGreaterThanOrEqual(0);
  });
});
