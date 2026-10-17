/**
 * SCE-TOURNAMENT-PLANNER-01G-R1 — regeneration objective in search + lifecycle proofs.
 */

import { describe, expect, it } from "vitest";
import { EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES } from "../../schedule-optimiser/constants";
import { optimiseTournamentSchedule } from "../../schedule-optimiser/optimise";
import {
  compareRegenerationObjectiveBundles,
  computeRegenerationChangeMetrics,
} from "../disruption-metrics";
import { regenerateTournamentSchedule } from "../regenerate";
import {
  mergeScheduleLocks,
  resolveEffectiveScheduleLockDimension,
  resolveFixtureScheduleLocksFromBaseline,
} from "../../schedule-lock/normalize";
import {
  optimiserInput,
  sequentialFixtures,
  tournamentPitch,
  windowFromClock,
} from "../../schedule-optimiser/__tests__/helpers";
const DISRUPTION_LEX_ORDER = [
  "fixturesMovedInBoth",
  "fixturesMovedInTime",
  "fixturesMovedInPitch",
  "totalTimeDisplacementMinutes",
  "unchangedFixtureCount (maximize)",
  "01F2 schedule objective vector",
] as const;

describe("01G-R1 — regeneration objective contract", () => {
  it("documents deterministic lex order (disruption before 01F2)", () => {
    expect(DISRUPTION_LEX_ORDER[0]).toBe("fixturesMovedInBoth");
    expect(DISRUPTION_LEX_ORDER.at(-1)).toContain("01F2");
  });

  it("legacy isLocked normalizes to TIME_AND_PITCH when dimension absent", () => {
    expect(
      resolveEffectiveScheduleLockDimension({ scheduleLockDimension: null, isLocked: true }),
    ).toBe("TIME_AND_PITCH");
    expect(
      resolveEffectiveScheduleLockDimension({ scheduleLockDimension: "TIME", isLocked: true }),
    ).toBe("TIME");
    expect(
      resolveEffectiveScheduleLockDimension({ scheduleLockDimension: null, isLocked: false }),
    ).toBeNull();
  });

  it("mergeScheduleLocks prefers explicit scheduleLocks over lockedAssignments duplicate", () => {
    const merged = mergeScheduleLocks({
      scheduleLocks: [{ fixtureId: "f1", dimension: "TIME" }],
      lockedAssignments: [{ fixtureId: "f1", tournamentPitchId: "pitch-a", startUtcMs: 0 }],
    });
    expect(merged).toEqual([{ fixtureId: "f1", dimension: "TIME" }]);
  });
});

describe("01G-R1 — complete search disruption priority (≤6 fixtures)", () => {
  it("selects schedule with less baseline disruption over better 01F2-only quality", () => {
    const fixtures = sequentialFixtures(4);
    const start0 = windowFromClock(0, 0).startUtcMs;
    const start10 = windowFromClock(10, 10).startUtcMs;
    const start20 = windowFromClock(20, 20).startUtcMs;
    const start30 = windowFromClock(30, 30).startUtcMs;
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
        endUtcMs: start0 + 600_000,
        resourceEndUtcMs: start0 + 600_000,
      },
      {
        fixtureId: "f2",
        tournamentPitchId: "pitch-b",
        startUtcMs: start0,
        endUtcMs: start0 + 600_000,
        resourceEndUtcMs: start0 + 600_000,
      },
      {
        fixtureId: "f3",
        tournamentPitchId: "pitch-a",
        startUtcMs: start10,
        endUtcMs: start10 + 600_000,
        resourceEndUtcMs: start10 + 600_000,
      },
      {
        fixtureId: "f4",
        tournamentPitchId: "pitch-b",
        startUtcMs: start10,
        endUtcMs: start10 + 600_000,
        resourceEndUtcMs: start10 + 600_000,
      },
    ];
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [{ fixtureId: "f1", dimension: "TIME_AND_PITCH" }],
    });
    expect(result.hardConstraintValidationOk).toBe(true);
    expect(result.searchStats.completeAssignmentsExplored).toBeGreaterThan(0);
    expect(fixtures.length).toBeLessThanOrEqual(EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES);

    const resolvedLocks = resolveFixtureScheduleLocksFromBaseline({
      locks: [{ fixtureId: "f1", dimension: "TIME_AND_PITCH" }],
      baselineAssignments: baseline,
      matchDurationMinutes: 10,
      transitionMinutes: 0,
    });
    const resultMetrics = result.changeMetrics!;
    const baselineWitnessMetrics = computeRegenerationChangeMetrics({
      baselineAssignments: baseline,
      resultAssignments: baseline,
      resolvedLocks,
    });
    const witnessBundle = {
      changeMetrics: baselineWitnessMetrics,
      scheduleObjectiveMetrics: result.baselineObjectiveMetrics ?? result.objectiveScore!,
    };
    const resultBundle = {
      changeMetrics: resultMetrics,
      scheduleObjectiveMetrics: result.objectiveScore!,
    };
    expect(compareRegenerationObjectiveBundles(resultBundle, witnessBundle)).toBeLessThanOrEqual(0);

    const worseAlternative = [
      baseline[0]!,
      { ...baseline[1]!, tournamentPitchId: "pitch-a", startUtcMs: start20, endUtcMs: start20 + 600_000, resourceEndUtcMs: start20 + 600_000 },
      { ...baseline[2]!, tournamentPitchId: "pitch-b", startUtcMs: start30, endUtcMs: start30 + 600_000, resourceEndUtcMs: start30 + 600_000 },
      baseline[3]!,
    ];
    const worseMetrics = computeRegenerationChangeMetrics({
      baselineAssignments: baseline,
      resultAssignments: worseAlternative,
      resolvedLocks,
    });
    expect(
      compareRegenerationObjectiveBundles(resultBundle, {
        changeMetrics: worseMetrics,
        scheduleObjectiveMetrics: result.objectiveScore!,
      }),
    ).toBeLessThan(0);
  });
});

describe("01G-R1 — bounded search disruption priority (>6 fixtures)", () => {
  it("does not accept relocations that worsen regeneration objective", () => {
    const fixtures = sequentialFixtures(8);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [
        tournamentPitch("pitch-a", 0),
        tournamentPitch("pitch-b", 1),
        tournamentPitch("pitch-c", 2),
      ],
      config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 5 },
      tournamentWindow: windowFromClock(0, 800),
    });
    const baseline = optimiseTournamentSchedule(input);
    expect(baseline.hardConstraintValidationOk).toBe(true);

    const regen = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline.assignments,
      scheduleLocks: [],
    });
    expect(regen.hardConstraintValidationOk).toBe(true);
    expect(regen.searchStats.boundedImprovementEvaluations ?? 0).toBeGreaterThan(0);
    expect(regen.changeMetrics?.fixturesMovedInBoth ?? 0).toBe(0);
    expect(regen.changeMetrics?.fixturesMovedInTime ?? 0).toBe(0);
    expect(regen.changeMetrics?.fixturesMovedInPitch ?? 0).toBe(0);
    expect(regen.changeMetrics?.unchangedFixtureCount).toBe(8);
  }, 60_000);
});

describe("01G-R1 — zero-lock baseline + necessary change", () => {
  it("uses current schedule as disruption baseline with zero locks", () => {
    const fixtures = sequentialFixtures(3);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 180),
    });
    const baseline = optimiseTournamentSchedule(input).assignments;
    const regen = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [],
    });
    expect(regen.changeMetrics?.unchangedFixtureCount).toBe(3);
  }, 30_000);

  it("moves unlocked fixtures when a new full lock blocks the baseline slot on the same pitch", () => {
    const start0 = windowFromClock(0, 0).startUtcMs;
    const start10 = windowFromClock(10, 10).startUtcMs;
    const fixtures = sequentialFixtures(2);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 60),
    });
    const baseline = [
      {
        fixtureId: "f1",
        tournamentPitchId: "pitch-a",
        startUtcMs: start0,
        endUtcMs: start0 + 600_000,
        resourceEndUtcMs: start0 + 600_000,
      },
      {
        fixtureId: "f2",
        tournamentPitchId: "pitch-a",
        startUtcMs: start10,
        endUtcMs: start10 + 600_000,
        resourceEndUtcMs: start10 + 600_000,
      },
    ];
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [{ fixtureId: "f2", dimension: "TIME_AND_PITCH" }],
    });
    expect(result.hardConstraintValidationOk).toBe(true);
    const f1 = result.assignments.find((a) => a.fixtureId === "f1")!;
    expect(f1.startUtcMs).not.toBe(start10);
    const f2 = result.assignments.find((a) => a.fixtureId === "f2")!;
    expect(f2.startUtcMs).toBe(start10);
    expect(f2.tournamentPitchId).toBe("pitch-a");
  });
});

describe("01G-R1 — end-to-end minimal disruption selection", () => {
  it(
    "returns identical schedule + change metrics on repeated mixed-lock regeneration",
    () => {
      const fixtures = sequentialFixtures(4);
      const input = optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 180),
      });
      const baseline = optimiseTournamentSchedule(input).assignments;
      const locks = [
        { fixtureId: "f1", dimension: "TIME" as const },
        { fixtureId: "f2", dimension: "PITCH" as const },
        { fixtureId: "f3", dimension: "TIME_AND_PITCH" as const },
      ];
      const payload = { ...input, baselineAssignments: baseline, scheduleLocks: locks };
      const a = regenerateTournamentSchedule(payload);
      const b = regenerateTournamentSchedule(payload);
      expect(a.assignments).toEqual(b.assignments);
      expect(a.changeMetrics).toEqual(b.changeMetrics);
      expect(a.hardConstraintValidationOk).toBe(true);
    },
    30_000,
  );
});

describe("01G-R1 — lock dimension preservation", () => {
  it("never mutates locked time, pitch, or full assignments", () => {
    const fixtures = sequentialFixtures(4);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 240),
    });
    const baseline = optimiseTournamentSchedule(input).assignments;
    const timeLock = baseline[0]!;
    const pitchLock = baseline[1]!;
    const fullLock = baseline[2]!;
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [
        { fixtureId: timeLock.fixtureId, dimension: "TIME" },
        { fixtureId: pitchLock.fixtureId, dimension: "PITCH" },
        { fixtureId: fullLock.fixtureId, dimension: "TIME_AND_PITCH" },
      ],
    });
    const timeResult = result.assignments.find((a) => a.fixtureId === timeLock.fixtureId)!;
    const pitchResult = result.assignments.find((a) => a.fixtureId === pitchLock.fixtureId)!;
    const fullResult = result.assignments.find((a) => a.fixtureId === fullLock.fixtureId)!;
    expect(timeResult.startUtcMs).toBe(timeLock.startUtcMs);
    expect(timeResult.endUtcMs).toBe(timeLock.endUtcMs);
    expect(pitchResult.tournamentPitchId).toBe(pitchLock.tournamentPitchId);
    expect(fullResult).toMatchObject({
      startUtcMs: fullLock.startUtcMs,
      endUtcMs: fullLock.endUtcMs,
      tournamentPitchId: fullLock.tournamentPitchId,
    });
  }, 60_000);
});

describe("01G-R1 — property-style regeneration invariants", () => {
  it("keeps exactly one assignment per fixture without topology mutation", () => {
    const fixtures = sequentialFixtures(4);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
      tournamentWindow: windowFromClock(0, 180),
    });
    const baseline = optimiseTournamentSchedule(input).assignments;
    const result = regenerateTournamentSchedule({
      ...input,
      baselineAssignments: baseline,
      scheduleLocks: [{ fixtureId: "f1", dimension: "TIME" }],
    });
    expect(result.assignments).toHaveLength(fixtures.length);
    expect(new Set(result.assignments.map((a) => a.fixtureId)).size).toBe(fixtures.length);
    expect(result.hardConstraintValidationOk).toBe(true);
  }, 30_000);
});
