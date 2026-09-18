/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY,
  defaultWeekplannerVisibleTimeRange,
  parseStoredWeekplannerVisibleTimeRange,
  persistWeekplannerVisibleTimeRange,
  readStoredWeekplannerVisibleTimeRange,
  validateWeekplannerVisibleTimeRange,
} from "../weekplanner-visible-time-range";

describe("weekplanner visible time range", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to 08:00–23:00 when no preference exists", () => {
    const pref = readStoredWeekplannerVisibleTimeRange();
    expect(pref).toEqual(defaultWeekplannerVisibleTimeRange());
    expect(pref.startMinutes).toBe(8 * 60);
    expect(pref.endMinutes).toBe(23 * 60);
  });

  it("persists and restores a custom range", () => {
    persistWeekplannerVisibleTimeRange({ startMinutes: 7 * 60, endMinutes: 21 * 60 + 30 });
    expect(readStoredWeekplannerVisibleTimeRange()).toEqual({
      startMinutes: 7 * 60,
      endMinutes: 21 * 60 + 30,
    });
    expect(localStorage.getItem(WEEKPLANNER_VISIBLE_TIME_RANGE_STORAGE_KEY)).toBeTruthy();
  });

  it("rejects invalid ranges", () => {
    expect(validateWeekplannerVisibleTimeRange(10 * 60, 10 * 60)).toMatch(/Endzeit/);
    expect(validateWeekplannerVisibleTimeRange(12 * 60, 10 * 60)).toMatch(/Endzeit/);
    expect(validateWeekplannerVisibleTimeRange(8 * 60 + 15, 23 * 60)).toMatch(/30-Minuten/);
  });

  it("falls back for malformed persisted shapes without throwing", () => {
    const fallback = defaultWeekplannerVisibleTimeRange();
    expect(parseStoredWeekplannerVisibleTimeRange(null)).toEqual(fallback);
    expect(parseStoredWeekplannerVisibleTimeRange("")).toEqual(fallback);
    expect(parseStoredWeekplannerVisibleTimeRange("{")).toEqual(fallback);
    expect(parseStoredWeekplannerVisibleTimeRange({ startMinutes: "08:00", endMinutes: "bad" })).toEqual(
      fallback,
    );
    expect(parseStoredWeekplannerVisibleTimeRange({ start: "07:00", end: "21:30" })).toEqual({
      startMinutes: 7 * 60,
      endMinutes: 21 * 60 + 30,
    });
    expect(parseStoredWeekplannerVisibleTimeRange({ startMinutes: 23 * 60, endMinutes: 8 * 60 })).toEqual(
      fallback,
    );
  });
});
