import { describe, expect, it } from "vitest";
import {
  calendarDayDeltaFromPixelDrag,
  calendarMoveWithDayAndTimeDelta,
  resolveCalendarTargetDayKey,
} from "../scheduler/calendar-date-shift";
import { dayKeyInTimeZone, zonedMinutesFromMidnight } from "../scheduler/time-zone";

const TZ = "Europe/Zurich";
const WEEK = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"];

describe("calendar date shift", () => {
  it("maps horizontal drag to whole-day delta", () => {
    expect(calendarDayDeltaFromPixelDrag(118, 120)).toBe(1);
    expect(calendarDayDeltaFromPixelDrag(-240, 120)).toBe(-2);
  });

  it("moves activity between days preserving local time", () => {
    const start = new Date("2026-09-20T07:30:00.000Z"); // 09:30 CEST
    const end = new Date("2026-09-20T09:30:00.000Z");
    const moved = calendarMoveWithDayAndTimeDelta(start, end, -1, 0, WEEK, TZ);
    expect(moved).not.toBeNull();
    expect(dayKeyInTimeZone(moved!.startAt, TZ)).toBe("2026-09-19");
    expect(zonedMinutesFromMidnight(moved!.startAt, TZ)).toBe(9 * 60 + 30);
    expect((moved!.endAt.getTime() - moved!.startAt.getTime()) / 60_000).toBe(120);
  });

  it("clamps day delta to visible week", () => {
    const start = new Date("2026-09-14T07:30:00.000Z");
    expect(resolveCalendarTargetDayKey(start, -5, WEEK, TZ)).toBe("2026-09-14");
    const sunday = new Date("2026-09-20T07:30:00.000Z");
    expect(resolveCalendarTargetDayKey(sunday, 3, WEEK, TZ)).toBe("2026-09-20");
  });

  it("applies vertical minute delta with day change", () => {
    const start = new Date("2026-09-20T07:30:00.000Z");
    const end = new Date("2026-09-20T09:30:00.000Z");
    const moved = calendarMoveWithDayAndTimeDelta(start, end, 0, 30, WEEK, TZ);
    expect(zonedMinutesFromMidnight(moved!.startAt, TZ)).toBe(10 * 60);
  });
});
