import { describe, expect, it } from "vitest";
import { resolvePersonalCalendarSelectedDayKey } from "../resolve-personal-calendar-selected-day-key";
import type { NormalizedCalendarItem } from "../normalized-calendar-item-types";

function item(id: string): NormalizedCalendarItem {
  return {
    id,
    sourceType: "event",
    sourceId: "1",
    semanticType: "EVENT",
    title: "Test",
    startAt: new Date("2026-09-23T12:00:00.000Z"),
    allDay: false,
    deepLink: null,
    iconKey: null,
    typeLabel: "Event",
    ariaLabel: "Event",
  };
}

describe("SCE-CALENDAR-UX-04 — selected day default", () => {
  it("selects today when viewing the current month", () => {
    const todayKey = "2026-09-27";
    const selected = resolvePersonalCalendarSelectedDayKey({
      monthParam: "2026-09",
      timeZone: "Europe/Zurich",
      todayKey,
      itemsByDayKey: {},
    });
    expect(selected).toBe(todayKey);
  });

  it("selects first relevant day when today is outside the month", () => {
    const selected = resolvePersonalCalendarSelectedDayKey({
      monthParam: "2026-08",
      timeZone: "Europe/Zurich",
      todayKey: "2026-09-27",
      itemsByDayKey: { "2026-08-14": [item("event:1")] },
    });
    expect(selected).toBe("2026-08-14");
  });

  it("falls back to first in-month day when no items exist", () => {
    const selected = resolvePersonalCalendarSelectedDayKey({
      monthParam: "2026-08",
      timeZone: "Europe/Zurich",
      todayKey: "2026-09-27",
      itemsByDayKey: {},
    });
    expect(selected).toBe("2026-08-01");
  });
});
