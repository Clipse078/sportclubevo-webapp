import { describe, expect, it } from "vitest";
import { computeRoundParallelScheduleWithBreaks } from "../round-scheduled-breaks";

describe("round-scheduled-breaks", () => {
  it("computes multiple break windows and shifted round starts", () => {
    const start = new Date("2026-06-01T10:00:00").getTime();
    const result = computeRoundParallelScheduleWithBreaks({
      tournamentStartUtcMs: start,
      roundCount: 6,
      matchDurationMinutes: 10,
      transitionMinutes: 5,
      roundBreaks: [
        { afterRoundNumber: 2, durationMinutes: 10 },
        { afterRoundNumber: 5, durationMinutes: 15 },
      ],
    });
    expect(result.breakWindows).toHaveLength(2);
    expect(result.breakWindows[0]?.afterRoundNumber).toBe(2);
    expect(result.breakWindows[1]?.afterRoundNumber).toBe(5);
    expect(result.breakWindows[0]!.endUtcMs - result.breakWindows[0]!.startUtcMs).toBe(10 * 60_000);
    expect(result.roundStartUtcMs[2]).toBe(result.breakWindows[0]!.endUtcMs);
    expect(result.roundStartUtcMs[5]).toBe(result.breakWindows[1]!.endUtcMs);
  });
});
