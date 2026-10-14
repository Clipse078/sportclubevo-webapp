import { describe, expect, it } from "vitest";
import {
  combineIsoDateAndTimeToDateTimeLocal,
  compareWallClockRange,
  formatIsoDateKeyToDisplay,
  normalizeTimeInput,
  parseDisplayDateInput,
  splitDateTimeLocalValue,
} from "@/lib/sce/activity-datetime/sce-activity-datetime";

describe("SCE activity datetime contract", () => {
  it("formats and parses DD.MM.YYYY", () => {
    expect(formatIsoDateKeyToDisplay("2026-10-14")).toBe("14.10.2026");
    const parsed = parseDisplayDateInput("14.10.2026");
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.isoDateKey).toBe("2026-10-14");
    }
  });

  it("rejects invalid calendar dates", () => {
    const parsed = parseDisplayDateInput("31.02.2026");
    expect(parsed.ok).toBe(false);
  });

  it("normalizes time variants", () => {
    expect(normalizeTimeInput("9:35")).toEqual({ ok: true, normalized: "09:35" });
    expect(normalizeTimeInput("935")).toEqual({ ok: true, normalized: "09:35" });
    expect(normalizeTimeInput("17")).toEqual({ ok: true, normalized: "17:00" });
    expect(normalizeTimeInput("25:00").ok).toBe(false);
  });

  it("combines datetime-local storage values", () => {
    const value = combineIsoDateAndTimeToDateTimeLocal("2026-10-14", "09:35");
    expect(value).toBe("2026-10-14T09:35");
    expect(splitDateTimeLocalValue(value)).toEqual({ isoDateKey: "2026-10-14", time: "09:35" });
  });

  it("validates end after start", () => {
    expect(
      compareWallClockRange({
        startDate: "2026-10-14",
        startTime: "09:35",
        endDate: "2026-10-14",
        endTime: "13:35",
      }).ok,
    ).toBe(true);
    expect(
      compareWallClockRange({
        startDate: "2026-10-14",
        startTime: "13:35",
        endDate: "2026-10-14",
        endTime: "09:35",
      }).ok,
    ).toBe(false);
  });
});
