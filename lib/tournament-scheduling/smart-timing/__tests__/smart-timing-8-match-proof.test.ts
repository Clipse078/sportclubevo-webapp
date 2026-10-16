import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { BASE_MS, baseInput, sequentialFixtures, windowFromClock } from "./helpers";

/**
 * Canonical product example:
 * 1 Tournament Pitch, 10:00–12:00, 8 sequential fixtures, 12 min match + 3 min transition.
 *
 * SCE slot occupancy charges match + transition per fixture (01D H9), including the final slot.
 * 8 × (12 + 3) = 120 minutes → fits exactly in a 120-minute window.
 */
describe("Smart Timing — 8-match canonical proof", () => {
  it("proves 120-minute arithmetic under SCE transition semantics", () => {
    const fixtures = sequentialFixtures(8);
    const forward = assessTournamentTiming(
      baseInput({
        mode: "FORWARD",
        fixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
        endBoundaryKnown: false,
      }),
    );
    expect(forward.requiredSpanMinutes).toBe(120);
    expect(forward.predictedFinishUtcMs).toBe(BASE_MS + 120 * 60_000);

    const fixed = assessTournamentTiming(
      baseInput({
        mode: "FIXED_ASSESSMENT",
        fixtures,
        config: { matchDurationMinutes: 12, transitionMinutes: 3, minRestMinutes: 0 },
        tournamentWindow: windowFromClock(0, 120),
      }),
    );
    expect(fixed.feasibilityStatus).not.toBe("INFEASIBLE");
    expect(fixed.reserveMinutes).toBe(0);

    const backward = assessTournamentTiming(
      baseInput({
        mode: "BACKWARD",
        fixtures,
        tournamentWindow: windowFromClock(0, 120),
        config: { matchDurationMinutes: 1, transitionMinutes: 0, minRestMinutes: 0 },
      }),
    );
    expect(backward.durationRecommendation?.matchDurationMinutes).toBe(15);
    expect(backward.durationRecommendation?.transitionMinutes).toBe(0);
  });
});
