import { describe, expect, it } from "vitest";
import { assignIntervalLanes } from "../interval-lanes";
import {
  CALENDAR_PIXELS_PER_MINUTE,
  computeVisibleTimeRange,
  durationToCalendarHeightPx,
  minutesToCalendarTopPx,
} from "../time-scale";

describe("scheduler time scale", () => {
  it("computes stable bounds for early and late activities", () => {
    const range = computeVisibleTimeRange(
      [
        { startAt: new Date("2026-09-14T05:30:00.000Z"), endAt: new Date("2026-09-14T07:00:00.000Z") },
        { startAt: new Date("2026-09-14T19:00:00.000Z"), endAt: new Date("2026-09-14T21:30:00.000Z") },
      ],
      "UTC",
    );
    expect(range.endMinutes - range.startMinutes).toBeGreaterThanOrEqual(6 * 60);
    expect(range.startMinutes).toBeLessThanOrEqual(5 * 60 + 30);
    expect(range.endMinutes).toBeGreaterThanOrEqual(21 * 60 + 30);
  });

  it("maps duration to pixel height", () => {
    const range = computeVisibleTimeRange(
      [{ startAt: new Date("2026-09-14T15:00:00.000Z"), endAt: new Date("2026-09-14T17:00:00.000Z") }],
      "UTC",
    );
    const top = minutesToCalendarTopPx(15 * 60, range, CALENDAR_PIXELS_PER_MINUTE);
    const height = durationToCalendarHeightPx(15 * 60, 17 * 60, range, CALENDAR_PIXELS_PER_MINUTE);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(height).toBeCloseTo(120 * CALENDAR_PIXELS_PER_MINUTE, 1);
  });

  it("uses fallback range for empty weeks", () => {
    const range = computeVisibleTimeRange([], "Europe/Zurich");
    expect(range.totalMinutes).toBeGreaterThan(0);
  });
});

describe("interval lanes", () => {
  it("assigns separate lanes for overlapping intervals", () => {
    const lanes = assignIntervalLanes([
      { id: "a", startMs: 0, endMs: 90 },
      { id: "b", startMs: 15, endMs: 105 },
    ]);
    expect(lanes.get("a")?.lane).toBe(0);
    expect(lanes.get("b")?.lane).toBe(1);
    expect(lanes.get("a")?.totalLanes).toBe(2);
  });

  it("reuses lanes when intervals do not overlap", () => {
    const lanes = assignIntervalLanes([
      { id: "a", startMs: 0, endMs: 60 },
      { id: "b", startMs: 60, endMs: 120 },
    ]);
    expect(lanes.get("a")?.lane).toBe(0);
    expect(lanes.get("b")?.lane).toBe(0);
  });

  it("sorts deterministically by id tie-breaker", () => {
    const lanes = assignIntervalLanes([
      { id: "b", startMs: 0, endMs: 60 },
      { id: "a", startMs: 0, endMs: 60 },
    ]);
    expect(lanes.get("a")!.lane).toBeLessThanOrEqual(lanes.get("b")!.lane);
  });
});
