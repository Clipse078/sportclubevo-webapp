import { describe, expect, it } from "vitest";
import { buildPlanungTimeScale, normalizePlanungInstantIso, planungInstantsEqual } from "../time-scale";

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

  it("R7.4 — normalizes break anchors and compares instants safely", () => {
    const scale = buildPlanungTimeScale({
      windowStartUtc: "2026-08-01T08:00:00.000Z",
      windowEndUtc: "2026-08-01T12:00:00.000Z",
      matchDurationMinutes: 20,
      transitionMinutes: 5,
      assignmentStartUtc: ["2026-08-01T08:00:00.000Z"],
      breakStartUtc: ["2026-08-01T08:25:00.000Z"],
    });
    const breakAnchor = scale.rowAnchorsUtc.find((a) =>
      planungInstantsEqual(a, "2026-08-01T08:25:00.000Z"),
    );
    expect(breakAnchor).toBeDefined();
    expect(normalizePlanungInstantIso("2026-08-01T08:25:00.000Z")).toBe(breakAnchor);
  });
});
