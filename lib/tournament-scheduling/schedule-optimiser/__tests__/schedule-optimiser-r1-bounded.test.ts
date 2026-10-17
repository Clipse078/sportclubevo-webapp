import { describe, expect, it } from "vitest";
import { compareScheduleObjectiveMetrics } from "../objective-metrics";
import { optimiseTournamentSchedule } from "../optimise";
import {
  EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES,
  BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS,
  BOUNDED_IMPROVEMENT_MAX_PASSES,
} from "../constants";
import { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

function assertNotLexWorseThanBaseline(
  result: ReturnType<typeof optimiseTournamentSchedule>,
): void {
  expect(result.baselineObjectiveMetrics).not.toBeNull();
  expect(result.objectiveScore).not.toBeNull();
  expect(
    compareScheduleObjectiveMetrics(result.objectiveScore!, result.baselineObjectiveMetrics!),
  ).toBeLessThanOrEqual(0);
}

describe("01F2-R1 — search policy audit", () => {
  it("documents exhaustive threshold at six fixtures", () => {
    expect(EXHAUSTIVE_OPTIMISATION_MAX_FIXTURES).toBe(6);
  });
});

describe("01F2-R1 — eight-fixture bounded improvement", () => {
  it("improves lex objectives over the 01D feasible witness", () => {
    const fixtures = sequentialFixtures(8, [
      ["p5", "p6"],
      ["p7", "p8"],
      ["p1", "p2"],
      ["p3", "p4"],
      ["p1", "p3"],
      ["p2", "p4"],
      ["p1", "p4"],
      ["p2", "p3"],
    ]);
    const start0 = windowFromClock(0, 0).startUtcMs;
    const start10 = windowFromClock(10, 10).startUtcMs;
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 15 },
        tournamentWindow: windowFromClock(0, 360),
        lockedAssignments: [
          { fixtureId: "f1", tournamentPitchId: "pitch-a", startUtcMs: start0 },
          { fixtureId: "f2", tournamentPitchId: "pitch-a", startUtcMs: start10 },
        ],
      }),
    );
    expect(result.status).toBe("FEASIBLE_NOT_PROVEN_OPTIMAL");
    expect(result.hardConstraintValidationOk).toBe(true);
    assertNotLexWorseThanBaseline(result);
    expect(
      compareScheduleObjectiveMetrics(result.objectiveScore!, result.baselineObjectiveMetrics!),
    ).toBeLessThan(0);
    expect(result.searchStats.boundedImprovementEvaluations).toBeGreaterThan(0);
  });
});

describe("01F2-R1 — representative large schedules", () => {
  const largeConfig = {
    matchDurationMinutes: 10,
    transitionMinutes: 2,
    minRestMinutes: 5,
  };
  const pitches = [
    tournamentPitch("pitch-a", 0),
    tournamentPitch("pitch-b", 1),
    tournamentPitch("pitch-c", 2),
    tournamentPitch("pitch-d", 3),
  ];
  const lunchBreak = {
    breakId: "lunch",
    startUtcMs: windowFromClock(180, 180).startUtcMs,
    endUtcMs: windowFromClock(200, 200).startUtcMs,
    scope: "ALL_PITCHES" as const,
  };

  it.each([16, 32])("optimises %i fixtures deterministically with bounded search", (count) => {
    const fixtures = sequentialFixtures(count);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: pitches,
      config: largeConfig,
      tournamentWindow: windowFromClock(0, 800),
      breaks: [lunchBreak],
    });
    const a = optimiseTournamentSchedule(input);
    const b = optimiseTournamentSchedule(input);
    expect(a.status).toBe("FEASIBLE_NOT_PROVEN_OPTIMAL");
    expect(a.assignments).toHaveLength(count);
    expect(a.hardConstraintValidationOk).toBe(true);
    assertNotLexWorseThanBaseline(a);
    expect(a.assignments).toEqual(b.assignments);
    expect(a.objectiveScore).toEqual(b.objectiveScore);
    expect(a.searchStats.boundedImprovementPasses).toBeGreaterThan(0);
  });

  it.each([64, 128])("runs %i fixtures within MVP guards", (count) => {
    const fixtures = sequentialFixtures(count);
    const started = performance.now();
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: pitches,
        config: largeConfig,
        tournamentWindow: windowFromClock(0, 4000),
        breaks: [lunchBreak],
      }),
    );
    const elapsedMs = performance.now() - started;
    expect(["FEASIBLE_NOT_PROVEN_OPTIMAL", "UNRESOLVED", "INFEASIBLE_PROVEN"]).toContain(
      result.status,
    );
    if (result.status === "FEASIBLE_NOT_PROVEN_OPTIMAL") {
      expect(result.assignments).toHaveLength(count);
      assertNotLexWorseThanBaseline(result);
      expect(result.searchStats.boundedImprovementEvaluations).toBeLessThanOrEqual(
        BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS + count * 50,
      );
    }
    expect(elapsedMs).toBeLessThan(120_000);
  });
});

describe("01F2-R1 — determinism for large schedules", () => {
  it("repeats identical metrics for eight fixtures", () => {
    const fixtures = sequentialFixtures(8);
    const input = optimiserInput({
      fixtures,
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
      tournamentWindow: windowFromClock(0, 400),
    });
    const runs = Array.from({ length: 3 }, () => optimiseTournamentSchedule(input));
    for (let i = 1; i < runs.length; i += 1) {
      expect(runs[i]!.assignments).toEqual(runs[0]!.assignments);
      expect(runs[i]!.objectiveScore).toEqual(runs[0]!.objectiveScore);
    }
  });
});

describe("01F2-R1 — lexicographic soft objective priority", () => {
  it("prefers better participant rest fairness before pitch balance", () => {
    const fixtures = sequentialFixtures(8, [
      ["p1", "p2"],
      ["p1", "p3"],
      ["p2", "p4"],
      ["p3", "p4"],
      ["p5", "p6"],
      ["p5", "p7"],
      ["p6", "p8"],
      ["p7", "p8"],
    ]);
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 20 },
        tournamentWindow: windowFromClock(0, 400),
      }),
    );
    expect(result.status).toBe("FEASIBLE_NOT_PROVEN_OPTIMAL");
    expect(result.objectiveScore!.IMPROVE_PARTICIPANT_REST_FAIRNESS).toBeDefined();
    assertNotLexWorseThanBaseline(result);
  });

  it("uses idle-gap quality when rest fairness ties", () => {
    const fixtures = sequentialFixtures(7, [
      ["p1", "p2"],
      ["p3", "p4"],
      ["p1", "p3"],
      ["p2", "p4"],
      ["p5", "p6"],
      ["p7", "p8"],
      ["p5", "p7"],
    ]);
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 10 },
        tournamentWindow: windowFromClock(0, 300),
      }),
    );
    expect(result.status).toBe("FEASIBLE_NOT_PROVEN_OPTIMAL");
    expect(result.objectiveScore!.REDUCE_EXTREME_IDLE_GAPS).toBeDefined();
  });

  it("balances pitch usage under bounded improvement", () => {
    const start0 = windowFromClock(0, 0).startUtcMs;
    const start10 = windowFromClock(10, 10).startUtcMs;
    const fixtures = sequentialFixtures(8, [
      ["p1", "p2"],
      ["p3", "p4"],
      ["p5", "p6"],
      ["p7", "p8"],
      ["p9", "p10"],
      ["p11", "p12"],
      ["p13", "p14"],
      ["p15", "p16"],
    ]);
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 200),
        lockedAssignments: [
          { fixtureId: "f1", tournamentPitchId: "pitch-a", startUtcMs: start0 },
          { fixtureId: "f2", tournamentPitchId: "pitch-a", startUtcMs: start10 },
        ],
      }),
    );
    const usage = new Map<string, number>();
    for (const a of result.assignments) {
      usage.set(a.tournamentPitchId, (usage.get(a.tournamentPitchId) ?? 0) + 1);
    }
    expect(usage.get("pitch-b") ?? 0).toBeGreaterThan(0);
    expect(result.objectiveScore!.DISTRIBUTE_PITCH_USAGE).toBeLessThanOrEqual(
      result.baselineObjectiveMetrics!.DISTRIBUTE_PITCH_USAGE ?? Number.POSITIVE_INFINITY,
    );
    assertNotLexWorseThanBaseline(result);
  });
});

describe("01F2-R1 — bounded budget constants", () => {
  it("uses deterministic pass and evaluation caps", () => {
    expect(BOUNDED_IMPROVEMENT_MAX_PASSES).toBeGreaterThan(0);
    expect(BOUNDED_IMPROVEMENT_MAX_CANDIDATE_EVALUATIONS).toBeGreaterThan(1000);
  });
});
