import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { BASE_MS, baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — backward matrix", () => {
  it("10:00–12:00, 1 pitch, 8 fixtures → operational vs mathematical maximum", () => {
    const fixtures = sequentialFixtures(8);
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures,
        tournamentWindow: windowFromClock(0, 120),
        config: { matchDurationMinutes: 1, transitionMinutes: 0, minRestMinutes: 0 },
        tournamentPitches: [tournamentPitch("pitch-a", 0)],
      }),
    );
    expect(result.mathematicalMaximumTiming).not.toBeNull();
    expect(result.mathematicalMaximumTiming!.matchDurationMinutes).toBe(15);
    expect(result.mathematicalMaximumTiming!.transitionMinutes).toBe(0);
    expect(result.durationRecommendation).not.toBeNull();
    expect(result.durationRecommendation!.transitionMinutes).toBeGreaterThan(0);
    expect(result.durationRecommendation!.matchDurationMinutes).toBe(14);
    expect(result.durationRecommendation!.transitionMinutes).toBe(1);
    expect(result.feasibilityStatus).not.toBe("INFEASIBLE");
  });

  it("2 pitches, 8 fixtures", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 120),
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
      }),
    );
    expect(result.durationRecommendation).not.toBeNull();
  });

  it("4 pitches, 8 fixtures", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 120),
        tournamentPitches: [
          tournamentPitch("p1", 0),
          tournamentPitch("p2", 1),
          tournamentPitch("p3", 2),
          tournamentPitch("p4", 3),
        ],
      }),
    );
    expect(result.durationRecommendation).not.toBeNull();
  });

  it("window with all-pitch break", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: sequentialFixtures(4),
        tournamentWindow: windowFromClock(0, 120),
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 30 * 60_000,
            endUtcMs: BASE_MS + 60 * 60_000,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    expect(result.durationRecommendation).not.toBeNull();
  });

  it("window with selected-pitch break", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: sequentialFixtures(4),
        tournamentWindow: windowFromClock(0, 120),
        tournamentPitches: [tournamentPitch("p1", 0), tournamentPitch("p2", 1)],
        breaks: [
          {
            breakId: "b1",
            startUtcMs: BASE_MS + 20 * 60_000,
            endUtcMs: BASE_MS + 50 * 60_000,
            scope: "SELECTED_PITCHES",
            tournamentPitchIds: ["p1"],
          },
        ],
      }),
    );
    expect(result.durationRecommendation).not.toBeNull();
  });

  it("window too small → no recommendation", () => {
    const result = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures: sequentialFixtures(8),
        tournamentWindow: windowFromClock(0, 30),
      }),
    );
    expect(result.durationRecommendation).toBeNull();
    expect(result.feasibilityStatus).toBe("INFEASIBLE");
  });
});
