import { describe, expect, it } from "vitest";
import {
  applyFeasibilitySlot,
  createFeasibilitySearchState,
} from "../../feasibility/complete-search";
import type { FeasibilityCandidateSlot } from "../../feasibility/types";
import { compareScheduleObjectiveMetrics, computeScheduleObjectiveMetrics } from "../objective-metrics";
import { optimiseTournamentSchedule } from "../optimise";
import { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

function slot(pitch: string, startMin: number, matchMin: number, transitionMin: number): FeasibilityCandidateSlot {
  const startUtcMs = windowFromClock(startMin, startMin).startUtcMs;
  const matchMs = matchMin * 60_000;
  const transMs = transitionMin * 60_000;
  return {
    slotIndex: startMin,
    tournamentPitchId: pitch,
    startUtcMs,
    participantEndUtcMs: startUtcMs + matchMs,
    resourceEndUtcMs: startUtcMs + matchMs + transMs,
  };
}

describe("01F2 — lexicographic fairness reasoning", () => {
  it("prefers lower pitch-usage variance when rest is equal", () => {
    const config = { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 };
    const pitchIds = ["pitch-a", "pitch-b"];

    const balanced = createFeasibilitySearchState();
    applyFeasibilitySlot(balanced, "f1", ["p1", "p2"], slot("pitch-a", 0, 10, 0));
    applyFeasibilitySlot(balanced, "f2", ["p3", "p4"], slot("pitch-b", 0, 10, 0));

    const skewed = createFeasibilitySearchState();
    applyFeasibilitySlot(skewed, "f1", ["p1", "p2"], slot("pitch-a", 0, 10, 0));
    applyFeasibilitySlot(skewed, "f2", ["p3", "p4"], slot("pitch-a", 10, 10, 0));

    const balancedMetrics = computeScheduleObjectiveMetrics({
      state: balanced,
      config,
      windowStartUtcMs: windowFromClock(0, 0).startUtcMs,
      pitchIds,
    });
    const skewedMetrics = computeScheduleObjectiveMetrics({
      state: skewed,
      config,
      windowStartUtcMs: windowFromClock(0, 0).startUtcMs,
      pitchIds,
    });
    expect(compareScheduleObjectiveMetrics(balancedMetrics, skewedMetrics)).toBeLessThan(0);
  });

  it("optimiser selects lex-preferred schedule among feasible layouts", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "p1",
        sideBParticipantId: "p2",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 1,
        sideAParticipantId: "p3",
        sideBParticipantId: "p4",
      },
    ];
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 30),
      }),
    );
    expect(result.status).toBe("OPTIMAL");
    const pitches = new Set(result.assignments.map((a) => a.tournamentPitchId));
    expect(pitches.size).toBe(2);
  });
});

describe("01F2 — determinism", () => {
  it("produces identical schedules for identical input", () => {
    const input = optimiserInput({
      fixtures: sequentialFixtures(4),
      tournamentPitches: [tournamentPitch("pitch-a", 0), tournamentPitch("pitch-b", 1)],
    });
    const a = optimiseTournamentSchedule(input);
    const b = optimiseTournamentSchedule(input);
    expect(a.assignments).toEqual(b.assignments);
    expect(a.objectiveScore).toEqual(b.objectiveScore);
  });
});

describe("01F2 — infeasible proven", () => {
  it("returns INFEASIBLE_PROVEN for impossibly short window", () => {
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures: sequentialFixtures(8),
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
        tournamentWindow: windowFromClock(0, 15),
      }),
    );
    expect(result.status).toBe("INFEASIBLE_PROVEN");
    expect(result.assignments).toHaveLength(0);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
