import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { BASE_MS, baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — R1 closure contracts", () => {
  const eightFixtures = sequentialFixtures(8);
  const canonicalWindow = windowFromClock(0, 120);

  it("distinguishes mathematical maximum from operational recommendation (8-match canonical)", () => {
    const backward = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: eightFixtures,
        tournamentWindow: canonicalWindow,
        config: { matchDurationMinutes: 1, transitionMinutes: 0, minRestMinutes: 0 },
      }),
    );
    expect(backward.mathematicalMaximumTiming).toEqual(
      expect.objectContaining({ matchDurationMinutes: 15, transitionMinutes: 0 }),
    );
    expect(backward.durationRecommendation).toEqual(
      expect.objectContaining({ matchDurationMinutes: 14, transitionMinutes: 1 }),
    );
    expect(backward.recommendationsAutoApplied).toBe(false);
  });

  it("8×(12+3) fixed assessment: exact fit, zero reserve", () => {
    const fixed = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures: eightFixtures,
        tournamentWindow: canonicalWindow,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
      }),
    );
    expect(fixed.feasibilityStatus).not.toBe("INFEASIBLE");
    expect(fixed.predictedFinishUtcMs).toBe(BASE_MS + 120 * 60_000);
    expect(fixed.reserveMinutes).toBe(0);
  });

  it("forward finish uses slot occupancy per fixture without extra post-final transition", () => {
    const forward = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures: eightFixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: canonicalWindow,
        endBoundaryKnown: false,
      }),
    );
    expect(forward.predictedFinishUtcMs).toBe(BASE_MS + 8 * (12 + 3) * 60_000);
  });

  it("deterministic assessments across repeated runs", () => {
    const input = baseInput({
      mode: "BACKWARD",
      fixtures: eightFixtures,
      tournamentWindow: canonicalWindow,
    });
    const a = assessTournamentTiming(input);
    const b = assessTournamentTiming(input);
    expect(a).toEqual(b);
  });

  it("minimum rest boundary: equal allowed, one minute below rejected", () => {
    const fixtures = [
      {
        fixtureId: "f1",
        stageKey: "MAIN",
        roundIndex: 0,
        slotIndexInRound: 0,
        sideAParticipantId: "team-a",
        sideBParticipantId: "team-b",
      },
      {
        fixtureId: "f2",
        stageKey: "MAIN",
        roundIndex: 1,
        slotIndexInRound: 0,
        sideAParticipantId: "team-a",
        sideBParticipantId: "team-c",
      },
    ];
    const participants = [
      { participantId: "team-a" },
      { participantId: "team-b" },
      { participantId: "team-c" },
    ];
    const ok = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures,
        participants,
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 10 },
        tournamentWindow: windowFromClock(0, 30),
      }),
    );
    const fail = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures,
        participants,
        config: { matchDurationMinutes: 10, transitionMinutes: 0, minRestMinutes: 11 },
        tournamentWindow: windowFromClock(0, 30),
      }),
    );
    expect(ok.feasibilityStatus).not.toBe("INFEASIBLE");
    expect(fail.feasibilityStatus).toBe("INFEASIBLE");
  });

  it("multi-pitch forward span decreases with parallel capacity", () => {
    const configs = [1, 2, 4].map((n) =>
      assessTournamentTiming(
        baseInput({
          mode: "FORWARD",
          fixtures: eightFixtures,
          tournamentPitches: Array.from({ length: n }, (_, i) => tournamentPitch(`p${i}`, i)),
          config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
          endBoundaryKnown: false,
        }),
      ),
    );
    expect(configs[1]!.requiredSpanMinutes).toBeLessThan(configs[0]!.requiredSpanMinutes);
    expect(configs[2]!.requiredSpanMinutes).toBeLessThanOrEqual(configs[1]!.requiredSpanMinutes);
  });
});
