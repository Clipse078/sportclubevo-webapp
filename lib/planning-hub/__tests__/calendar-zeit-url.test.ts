import { describe, expect, it } from "vitest";
import {
  hrefForCalendarZeit,
  mergeCalendarZeitIntoUrlState,
  readCalendarZeitFromSearch,
} from "../calendar-zeit-url";
import { parsePlanningHubUrlState } from "../planner-url";

const TZ = "Europe/Zurich";

describe("PLANNING-HUB-02E calendar zeit URL helpers", () => {
  it("reads explicit dayparts from search string", () => {
    expect(readCalendarZeitFromSearch("?week=2026-09-14&zeit=abend")).toBe("abend");
    expect(readCalendarZeitFromSearch("zeit=spaet")).toBe("spaet");
  });

  it("merges zeit into url state without altering week filters", () => {
    const base = parsePlanningHubUrlState({
      week: "2026-09-14",
      typ: "trainings",
      team: "t1",
    });
    const merged = mergeCalendarZeitIntoUrlState(base, "nachmittag");
    expect(merged.calendarZeit).toBe("nachmittag");
    expect(merged.week).toBe("2026-09-14");
    expect(merged.team).toBe("t1");
    const href = hrefForCalendarZeit(base, "nachmittag");
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("zeit=nachmittag");
    expect(href).toContain("typ=trainings");
  });

  it("daypart href does not change canonical week param", () => {
    const base = parsePlanningHubUrlState({ week: "2026-09-14", zeit: "abend" });
    const href = hrefForCalendarZeit(base, "spaet");
    expect(href).toContain("week=2026-09-14");
    expect(href).not.toContain("week=2026-09-07");
  });

  it("invalid zeit falls back to operational default", () => {
    const at = new Date("2026-09-16T14:00:00.000+02:00");
    expect(readCalendarZeitFromSearch("?zeit=not-a-daypart", { now: at, timeZone: TZ })).toBe(
      "nachmittag",
    );
  });
});
