import { describe, expect, it } from "vitest";
import { optimiseTournamentSchedule } from "../../schedule-optimiser/optimise";
import { regenerateTournamentSchedule } from "../regenerate";
import { compareRegenerationObjectiveBundles, computeRegenerationChangeMetrics } from "../disruption-metrics";
import { resolveFixtureScheduleLocksFromBaseline } from "../../schedule-lock/normalize";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "../../schedule-optimiser/__tests__/helpers";

function baselineSchedule(fixtureCount: number) {
  const fixtures = sequentialFixtures(fixtureCount);
  const input = optimiserInput({
    fixtures,
    tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
    config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
    tournamentWindow: windowFromClock(0, 240),
  });
  const optimised = optimiseTournamentSchedule(input);
  expect(optimised.hardConstraintValidationOk).toBe(true);
  return { fixtures, input, baseline: optimised.assignments };
}

describe("01G — lock invariants", () => {
  it(
    "fully locked valid schedule is idempotent",
    () => {
    const { fixtures, input, baseline } = baselineSchedule(3);
    const locks = baseline.map((a) => ({
      fixtureId: a.fixtureId,
      dimension: "TIME_AND_PITCH" as const,
    }));
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: locks,
    });
    expect(result.status).not.toBe("INFEASIBLE_PROVEN");
    expect(result.assignments).toEqual(baseline);
    expect(result.changeMetrics?.fixturesMovedInBoth).toBe(0);
    },
    30_000,
  );

  it(
    "zero-lock regeneration matches canonical optimiser contract",
    () => {
    const { fixtures, input, baseline } = baselineSchedule(3);
    const regen = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [],
    });
    const direct = optimiseTournamentSchedule(input);
    expect(regen.hardConstraintValidationOk).toBe(true);
    expect(direct.hardConstraintValidationOk).toBe(true);
    expect(regen.assignments).toHaveLength(fixtures.length);
    expect(direct.assignments).toHaveLength(fixtures.length);
    },
    30_000,
  );

  it("TIME lock preserves exact interval; pitch may change", () => {
    const fixtures = sequentialFixtures(3);
    const start0 = windowFromClock(0, 0).startUtcMs;
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 120),
    });
    const baseline = [
      {
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startUtcMs: start0,
        endUtcMs: start0 + 10 * 60_000,
        resourceEndUtcMs: start0 + 10 * 60_000,
      },
      {
        fixtureId: "f2",
        tournamentPitchId: "pitch-b",
        startUtcMs: windowFromClock(20, 20).startUtcMs,
        endUtcMs: windowFromClock(30, 30).startUtcMs,
        resourceEndUtcMs: windowFromClock(30, 30).startUtcMs,
      },
      {
        fixtureId: "f3",
        tournamentPitchId: "pitch-b",
        startUtcMs: windowFromClock(40, 40).startUtcMs,
        endUtcMs: windowFromClock(50, 50).startUtcMs,
        resourceEndUtcMs: windowFromClock(50, 50).startUtcMs,
      },
    ];
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [{ fixtureId: "f1", dimension: "TIME" }],
    });
    expect(result.hardConstraintValidationOk).toBe(true);
    const f1 = result.assignments.find((a) => a.fixtureId === "f1")!;
    expect(f1.startUtcMs).toBe(start0);
    expect(f1.endUtcMs).toBe(start0 + 10 * 60_000);
  });

  it("PITCH lock preserves TournamentPitch; time may change", () => {
    const fixtures = sequentialFixtures(3);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 180),
    });
    const baseline = optimiseTournamentSchedule(input).assignments;
    const lockedPitch = baseline.find((a) => a.fixtureId === "f1")!.tournamentPitchId;
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [{ fixtureId: "f1", dimension: "PITCH" }],
    });
    const f1 = result.assignments.find((a) => a.fixtureId === "f1")!;
    expect(f1.tournamentPitchId).toBe(lockedPitch);
    expect(result.hardConstraintValidationOk).toBe(true);
  });

  it("rejects conflicting full locks on same pitch", () => {
    const start = windowFromClock(0, 0).startUtcMs;
    const fixtures = sequentialFixtures(2);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 60),
    });
    const baseline = [
      {
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startUtcMs: start,
        endUtcMs: start + 10 * 60_000,
        resourceEndUtcMs: start + 10 * 60_000,
      },
      {
        fixtureId: "f2",
        tournamentPitchId: "pitch-a",
        startUtcMs: start,
        endUtcMs: start + 10 * 60_000,
        resourceEndUtcMs: start + 10 * 60_000,
      },
    ];
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [
        { fixtureId: "f1", dimension: "TIME_AND_PITCH" },
        { fixtureId: "f2", dimension: "TIME_AND_PITCH" },
      ],
    });
    expect(result.status).toBe("INFEASIBLE_PROVEN");
    expect(result.lockConflictDiagnostics.some((d) => d.category === "PITCH_OVERLAP")).toBe(true);
  });

  it(
    "deterministic regeneration",
    () => {
    const { input, baseline } = baselineSchedule(3);
    const locks = [{ fixtureId: "f1", dimension: "TIME" as const }];
    const a = regenerateTournamentSchedule({ ...input, baselineAssignments: baseline, scheduleLocks: locks });
    const b = regenerateTournamentSchedule({ ...input, baselineAssignments: baseline, scheduleLocks: locks });
    expect(a.assignments).toEqual(b.assignments);
    },
    30_000,
  );
});

describe("01G — minimal disruption lex order", () => {
  it("prefers fewer baseline changes before soft objectives", () => {
    const bundleA = {
      changeMetrics: {
        fixturesMovedInBoth: 0,
        fixturesMovedInTime: 0,
        fixturesMovedInPitch: 1,
        totalTimeDisplacementMinutes: 0,
        unchangedFixtureCount: 3,
      },
      scheduleObjectiveMetrics: { tournamentSpanMinutes: 100, MINIMIZE_TOURNAMENT_SPAN: 100 },
    };
    const bundleB = {
      changeMetrics: {
        fixturesMovedInBoth: 0,
        fixturesMovedInTime: 2,
        fixturesMovedInPitch: 0,
        totalTimeDisplacementMinutes: 30,
        unchangedFixtureCount: 1,
      },
      scheduleObjectiveMetrics: { tournamentSpanMinutes: 50, MINIMIZE_TOURNAMENT_SPAN: 50 },
    };
    expect(compareRegenerationObjectiveBundles(bundleA, bundleB)).toBeLessThan(0);
  });
});

describe("01G — property-style invariants", () => {
  it("resolved full lock matches baseline dimensions", () => {
    const baseline = [
      {
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startUtcMs: 0,
        endUtcMs: 600_000,
        resourceEndUtcMs: 600_000,
      },
    ];
    const resolved = resolveFixtureScheduleLocksFromBaseline({
      locks: [{ fixtureId: "f1", dimension: "TIME_AND_PITCH" }],
      baselineAssignments: baseline,
      matchDurationMinutes: 10,
      transitionMinutes: 0,
    });
    expect(resolved[0]?.startUtcMs).toBe(0);
    expect(resolved[0]?.tournamentPitchId).toBe("pitch-a");
    const metrics = computeRegenerationChangeMetrics({
      baselineAssignments: baseline,
      resultAssignments: baseline,
      resolvedLocks: resolved,
    });
    expect(metrics.fixturesMovedInBoth).toBe(0);
  });
});
