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

  describe("compact date entry (DDMMYYYY / DDMMYY)", () => {
    it("normalizes 8-digit compact dates", () => {
      expect(parseDisplayDateInput("17102026")).toEqual({
        ok: true,
        isoDateKey: "2026-10-17",
        display: "17.10.2026",
      });
      expect(parseDisplayDateInput("17012027")).toEqual({
        ok: true,
        isoDateKey: "2027-01-17",
        display: "17.01.2027",
      });
    });

    it("keeps formatted DD.MM.YYYY unchanged", () => {
      expect(parseDisplayDateInput("17.10.2026")).toEqual({
        ok: true,
        isoDateKey: "2026-10-17",
        display: "17.10.2026",
      });
    });

    it("normalizes 6-digit compact dates with 20xx year", () => {
      expect(parseDisplayDateInput("171026")).toEqual({
        ok: true,
        isoDateKey: "2026-10-17",
        display: "17.10.2026",
      });
    });

    it("accepts leap-day when valid", () => {
      expect(parseDisplayDateInput("29022028")).toEqual({
        ok: true,
        isoDateKey: "2028-02-29",
        display: "29.02.2028",
      });
    });

    it("rejects impossible calendar dates without rollover", () => {
      expect(parseDisplayDateInput("31112026").ok).toBe(false);
      expect(parseDisplayDateInput("29022026").ok).toBe(false);
      expect(parseDisplayDateInput("31.02.2026").ok).toBe(false);
    });
  });

  describe("compact time entry (HMM / HHMM)", () => {
    it("normalizes compact and formatted times", () => {
      expect(normalizeTimeInput("930")).toEqual({ ok: true, normalized: "09:30" });
      expect(normalizeTimeInput("0930")).toEqual({ ok: true, normalized: "09:30" });
      expect(normalizeTimeInput("1730")).toEqual({ ok: true, normalized: "17:30" });
      expect(normalizeTimeInput("17:30")).toEqual({ ok: true, normalized: "17:30" });
      expect(normalizeTimeInput("9:35")).toEqual({ ok: true, normalized: "09:35" });
      expect(normalizeTimeInput("935")).toEqual({ ok: true, normalized: "09:35" });
      expect(normalizeTimeInput("17")).toEqual({ ok: true, normalized: "17:00" });
    });

    it("rejects impossible times", () => {
      expect(normalizeTimeInput("2460").ok).toBe(false);
      expect(normalizeTimeInput("2365").ok).toBe(false);
      expect(normalizeTimeInput("25:00").ok).toBe(false);
    });
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
