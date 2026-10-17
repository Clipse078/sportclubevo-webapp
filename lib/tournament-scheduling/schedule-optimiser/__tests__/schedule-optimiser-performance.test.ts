import { describe, expect, it } from "vitest";
import { optimiseTournamentSchedule } from "../optimise";
import { optimiserInput, sequentialFixtures, tournamentPitch, windowFromClock } from "./helpers";

describe("01F2 — performance observations", () => {
  it.each([8, 16])("optimises %i fixtures within practical bounds", (count) => {
    const fixtures = sequentialFixtures(count);
    const started = performance.now();
    const result = optimiseTournamentSchedule(
      optimiserInput({
        fixtures,
        tournamentPitches: [
          tournamentPitch("pitch-a", 0),
          tournamentPitch("pitch-b", 1),
          tournamentPitch("pitch-c", 2),
          tournamentPitch("pitch-d", 3),
        ],
        config: { matchDurationMinutes: 10, transitionMinutes: 2, minRestMinutes: 5 },
        tournamentWindow: windowFromClock(0, 600),
        breaks: [
          {
            breakId: "lunch",
            startUtcMs: windowFromClock(180, 180).startUtcMs,
            endUtcMs: windowFromClock(200, 200).startUtcMs,
            scope: "ALL_PITCHES",
          },
        ],
      }),
    );
    const elapsedMs = performance.now() - started;
    expect(["OPTIMAL", "FEASIBLE_NOT_PROVEN_OPTIMAL", "INFEASIBLE_PROVEN", "UNRESOLVED"]).toContain(
      result.status,
    );
    expect(elapsedMs).toBeLessThan(count <= 16 ? 30_000 : 120_000);
    if (result.status === "OPTIMAL") {
      expect(result.searchStats.candidateSlotCount).toBeGreaterThan(0);
      expect(result.searchStats.nodesVisited).toBeGreaterThan(0);
    }
  });
});
