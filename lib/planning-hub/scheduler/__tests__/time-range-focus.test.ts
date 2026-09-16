import { describe, expect, it } from "vitest";
import {
  computeFocusedOperationalTimeRange,
  resolveCalendarTimeRange,
} from "../time-range-focus";
import { computeVisibleTimeRange } from "../time-scale";

describe("calendar time range focus", () => {
  it("derives focused range narrower than full week span when outliers exist", () => {
    const intervals = [
      { startAt: new Date("2026-09-19T06:00:00.000Z"), endAt: new Date("2026-09-19T08:00:00.000Z") },
      { startAt: new Date("2026-09-14T17:00:00.000Z"), endAt: new Date("2026-09-14T21:00:00.000Z") },
      { startAt: new Date("2026-09-15T18:00:00.000Z"), endAt: new Date("2026-09-15T20:00:00.000Z") },
    ];
    const result = resolveCalendarTimeRange(intervals, "UTC", "focused");
    const full = computeVisibleTimeRange(intervals, "UTC");
    expect(result.range.totalMinutes).toBeLessThanOrEqual(full.totalMinutes);
    expect(result.hasEarlierActivities || result.hasLaterActivities).toBe(true);
  });

  it("full mode exposes entire activity span", () => {
    const intervals = [
      { startAt: new Date("2026-09-14T05:00:00.000Z"), endAt: new Date("2026-09-14T06:00:00.000Z") },
      { startAt: new Date("2026-09-14T20:00:00.000Z"), endAt: new Date("2026-09-14T22:00:00.000Z") },
    ];
    const result = resolveCalendarTimeRange(intervals, "UTC", "full");
    expect(result.range.startMinutes).toBeLessThanOrEqual(5 * 60);
    expect(result.range.endMinutes).toBeGreaterThanOrEqual(22 * 60);
    expect(result.hasEarlierActivities).toBe(false);
  });

  it("empty week uses safe fallback", () => {
    const focused = computeFocusedOperationalTimeRange([], "Europe/Zurich");
    expect(focused.totalMinutes).toBeGreaterThan(0);
  });
});
