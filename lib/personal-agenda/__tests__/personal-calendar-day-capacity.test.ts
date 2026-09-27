import { describe, expect, it } from "vitest";
import {
  PERSONAL_CALENDAR_DAY_VISIBLE_BLOCK_LIMIT_LEGACY,
  resolvePersonalCalendarDayVisibleBlockLimit,
  resolvePersonalCalendarDayVisibleBlockLimitForViewport,
} from "../personal-calendar-day-capacity";

describe("personal calendar day capacity — UX-03R1", () => {
  it("exceeds legacy fixed limit of 3 on large desktop five-week months", () => {
    expect(resolvePersonalCalendarDayVisibleBlockLimit(5)).toBeGreaterThan(
      PERSONAL_CALENDAR_DAY_VISIBLE_BLOCK_LIMIT_LEGACY,
    );
  });

  it("reduces capacity slightly for six-week months", () => {
    expect(resolvePersonalCalendarDayVisibleBlockLimit(6)).toBe(4);
    expect(resolvePersonalCalendarDayVisibleBlockLimit(5)).toBe(5);
  });

  it("reduces capacity on tablet and mobile viewports", () => {
    expect(resolvePersonalCalendarDayVisibleBlockLimitForViewport(5, 1280)).toBe(5);
    expect(resolvePersonalCalendarDayVisibleBlockLimitForViewport(5, 800)).toBe(3);
    expect(resolvePersonalCalendarDayVisibleBlockLimitForViewport(5, 400)).toBe(2);
  });
});
