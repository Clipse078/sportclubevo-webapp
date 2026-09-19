import { describe, expect, it } from "vitest";
import { readCalendarZeitFromSearch, hrefForCalendarZeit } from "../calendar-zeit-url";
import {
  buildPlanningHubHref,
  parsePlanningHubUrlState,
  preserveCalendarZeitForHeute,
} from "../planner-url";
import { resolveCalendarViewport } from "../planning-dayparts";

const TZ = "Europe/Zurich";

function atLocal(hour: number, minute: number): Date {
  return new Date(
    `2026-09-16T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000+02:00`,
  );
}

describe("SCE-EVENTS-01C default Ganzer Tag", () => {
  it("resolves /planner/week without zeit to Ganzer Tag viewport", () => {
    const state = parsePlanningHubUrlState({});
    expect(state.calendarZeit).toBeUndefined();
    expect(resolveCalendarViewport(state.calendarZeit, atLocal(14, 0), TZ).mode).toBe("full");
  });

  it.each([
    ["morgen", "morgen"],
    ["nachmittag", "nachmittag"],
    ["abend", "abend"],
    ["spaet", "spaet"],
  ] as const)("legacy ?zeit=%s still parses; viewport uses Sichtbarer Zeitraum (full)", (param, expected) => {
    const state = parsePlanningHubUrlState({ zeit: param });
    expect(state.calendarZeit).toBe(expected);
    expect(resolveCalendarViewport(state.calendarZeit, atLocal(14, 0), TZ).mode).toBe("full");
  });

  it("explicit ?zeit=ganz resolves Ganzer Tag", () => {
    expect(parsePlanningHubUrlState({ zeit: "ganz" }).calendarZeit).toBe("ganz");
    expect(resolveCalendarViewport("ganz", atLocal(10, 0), TZ).mode).toBe("full");
  });

  it("selecting Ganzer Tag omits zeit from canonical URL", () => {
    const base = parsePlanningHubUrlState({ week: "2026-09-14", zeit: "abend" });
    const href = hrefForCalendarZeit(base, "ganz");
    expect(href).not.toContain("zeit=");
    expect(href).toContain("week=2026-09-14");
  });

  it("reload preserves explicit daypart", () => {
    const href = buildPlanningHubHref(parsePlanningHubUrlState({ zeit: "spaet" }));
    expect(href).toContain("zeit=spaet");
    expect(readCalendarZeitFromSearch(new URL(href, "https://example.test").search)).toBe("spaet");
  });

  it("Heute preserves selected time zoom (Ganzer Tag)", () => {
    expect(preserveCalendarZeitForHeute(undefined)).toBeUndefined();
    const href = buildPlanningHubHref(
      parsePlanningHubUrlState({ typ: "trainings" }),
      { week: "2026-09-14", calendarZeit: preserveCalendarZeitForHeute(undefined) },
    );
    expect(href).not.toContain("zeit=");
    expect(href).toContain("week=2026-09-14");
  });

  it("Heute preserves explicit Abend zoom", () => {
    const href = buildPlanningHubHref(parsePlanningHubUrlState({ zeit: "abend" }), {
      week: "2026-09-21",
      calendarZeit: preserveCalendarZeitForHeute("abend"),
    });
    expect(href).toContain("zeit=abend");
    expect(href).toContain("week=2026-09-21");
  });

  it("invalid zeit falls back to canonical Ganzer Tag (no local daypart)", () => {
    const state = parsePlanningHubUrlState({ zeit: "invalid" }, { now: atLocal(14, 0), timeZone: TZ });
    expect(state.calendarZeit).toBeUndefined();
    expect(resolveCalendarViewport(state.calendarZeit, atLocal(14, 0), TZ).mode).toBe("full");
  });
});

describe("SCE-EVENTS-01C daypart URL client contract", () => {
  it("daypart href patch does not require week refetch (URL-only state)", () => {
    const base = parsePlanningHubUrlState({ week: "2026-09-14" });
    const morgenHref = hrefForCalendarZeit(base, "morgen");
    expect(morgenHref).toContain("zeit=morgen");
    expect(morgenHref).toContain("week=2026-09-14");
    expect(morgenHref.startsWith("/dashboard/planner/week")).toBe(true);
  });
});
