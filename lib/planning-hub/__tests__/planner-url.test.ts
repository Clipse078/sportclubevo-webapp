import { describe, expect, it } from "vitest";
import {
  buildPlanningHubHref,
  parsePlanningHubUrlState,
  resolvePlanningHubResourceDay,
} from "../planner-url";

describe("planning-hub planner-url", () => {
  it("defaults to Kalender perspective and alle activity filter", () => {
    const state = parsePlanningHubUrlState({});
    expect(state.perspective).toBe("kalender");
    expect(state.activity).toBe("alle");
    expect(state.conflictsOnly).toBe(false);
    expect(state.calendarZeit).toBeUndefined();
  });

  it("accepts zeit=ganz as Ganzer Tag without requiring param in href", () => {
    const state = parsePlanningHubUrlState({ zeit: "ganz" });
    expect(state.calendarZeit).toBe("ganz");
    expect(buildPlanningHubHref(state)).not.toContain("zeit=");
  });

  it("maps legacy ansicht=woche to Liste", () => {
    expect(parsePlanningHubUrlState({ ansicht: "woche" }).perspective).toBe("liste");
  });

  it("round-trips week navigation and filters", () => {
    const state = parsePlanningHubUrlState({
      week: "2026-09-14",
      ansicht: "ressourcen",
      day: "2026-09-16",
      typ: "trainings",
      team: "team-1",
      facility: "fac-1",
      konflikte: "1",
      ressource: "garderobe",
    });
    const href = buildPlanningHubHref(state);
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("ansicht=ressourcen");
    expect(href).toContain("day=2026-09-16");
    expect(href).toContain("typ=trainings");
    expect(href).toContain("konflikte=1");
  });

  it("omits ansicht param for default Kalender", () => {
    const href = buildPlanningHubHref(parsePlanningHubUrlState({ week: "2026-09-14" }));
    expect(href).not.toContain("ansicht=");
    expect(href).toContain("week=2026-09-14");
  });

  it("preserves filters when switching perspective", () => {
    const base = parsePlanningHubUrlState({ typ: "turniere", team: "t1", konflikte: "1" });
    const href = buildPlanningHubHref(base, { perspective: "ressourcen", resourceCategory: "dressing" });
    expect(href).toContain("ansicht=ressourcen");
    expect(href).toContain("typ=turniere");
    expect(href).toContain("team=t1");
    expect(href).toContain("konflikte=1");
    expect(href).toContain("ressource=garderobe");
  });

  it("preserves filters when changing week via patch", () => {
    const base = parsePlanningHubUrlState({ typ: "spiele", konflikte: "1" });
    const href = buildPlanningHubHref(base, { week: "2026-09-21" });
    expect(href).toContain("week=2026-09-21");
    expect(href).toContain("typ=spiele");
    expect(href).toContain("konflikte=1");
  });

  it("resolves resource day from URL, today, or Monday", () => {
    const days = ["2026-09-14", "2026-09-15", "2026-09-16"];
    expect(resolvePlanningHubResourceDay(days, "2026-09-15", "2026-09-20")).toBe("2026-09-15");
    expect(resolvePlanningHubResourceDay(days, undefined, "2026-09-15")).toBe("2026-09-15");
    expect(resolvePlanningHubResourceDay(days, undefined, "2026-09-20")).toBe("2026-09-14");
  });
});
