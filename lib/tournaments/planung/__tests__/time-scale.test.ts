import { describe, expect, it } from "vitest";
import { buildPlanungTimeScale } from "../time-scale";

describe("planung time scale", () => {
  it("supports varying match and transition durations", () => {
    const scale = buildPlanungTimeScale({
      windowStartUtc: "2026-08-01T08:00:00.000Z",
      windowEndUtc: "2026-08-01T12:00:00.000Z",
      matchDurationMinutes: 25,
      transitionMinutes: 10,
      assignmentStartUtc: ["2026-08-01T08:35:00.000Z"],
      breakStartUtc: [],
    });
    expect(scale.matchDurationMinutes).toBe(25);
    expect(scale.transitionMinutes).toBe(10);
    expect(scale.rowAnchorsUtc).toContain("2026-08-01T08:35:00.000Z");
  });
});
