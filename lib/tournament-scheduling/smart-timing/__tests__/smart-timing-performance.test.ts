import { describe, expect, it } from "vitest";
import { assessTournamentTiming } from "../assess";
import { baseInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("Smart Timing — performance observations", () => {
  const fixtureCounts = [8, 16] as const;

  for (const count of fixtureCounts) {
    it(`assesses ${count} fixtures within interactive budget (observation)`, () => {
      const fixtures = sequentialFixtures(count);
      const pitchCount = Math.min(8, Math.max(2, Math.ceil(count / 8)));
      const pitches = Array.from({ length: pitchCount }, (_, i) =>
        tournamentPitch(`p${i}`, i),
      );
      const start = performance.now();
      const result = assessTournamentTiming(
        baseInput({
          mode: "FORWARD",
          fixtures,
          tournamentPitches: pitches,
          tournamentWindow: windowFromClock(0, count * 20),
          endBoundaryKnown: false,
        }),
      );
      const elapsedMs = performance.now() - start;
      expect(result.feasibilityStatus).toBeDefined();
      expect(elapsedMs).toBeLessThan(8_000);
    });
  }
});
