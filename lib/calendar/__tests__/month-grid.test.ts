import { describe, expect, it } from "vitest";
import {
  buildMonthGridDayKeys,
  buildMonthGridDates,
  resolvePersonalProgrammeMonthGridRange,
} from "../month-grid";
import { personalProgrammeDayKey } from "@/lib/personal-agenda/programme-day-key";

describe("month-grid", () => {
  it("builds Monday-first grid dates for a month", () => {
    const dates = buildMonthGridDates("2026-09");
    expect(dates.length % 7).toBe(0);
    expect(dates[0]?.getDay()).toBe(1);
  });

  it("resolvePersonalProgrammeMonthGridRange is bounded to visible grid", () => {
    const resolved = resolvePersonalProgrammeMonthGridRange({
      monthParam: "2026-09",
      timeZone: "Europe/Zurich",
    });
    expect(resolved.gridDayKeys.length).toBeGreaterThanOrEqual(28);
    expect(resolved.rangeEnd.getTime()).toBeGreaterThan(resolved.rangeStart.getTime());
    const spanDays =
      (resolved.rangeEnd.getTime() - resolved.rangeStart.getTime()) / (24 * 60 * 60 * 1000);
    expect(spanDays).toBeLessThanOrEqual(45);
  });

  it("aligns programme day keys with grid keys at tenant-local midnight boundary", () => {
    const timeZone = "Europe/Zurich";
    const keys = buildMonthGridDayKeys("2026-07", timeZone);
    const programmeKey = personalProgrammeDayKey(
      new Date("2026-07-23T22:15:00.000Z"),
      timeZone,
    );
    expect(keys).toContain(programmeKey);
  });
});
