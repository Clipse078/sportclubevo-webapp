import { describe, expect, it } from "vitest";
import { buildPlanningHubHref, parsePlanningHubUrlState } from "../planner-url";

describe("planning-hub planner-url", () => {
  it("defaults to Woche perspective and alle activity filter", () => {
    const state = parsePlanningHubUrlState({});
    expect(state.perspective).toBe("woche");
    expect(state.activity).toBe("alle");
    expect(state.conflictsOnly).toBe(false);
  });

  it("round-trips week navigation and filters", () => {
    const state = parsePlanningHubUrlState({
      week: "2026-09-14",
      ansicht: "ressourcen",
      typ: "trainings",
      team: "team-1",
      facility: "fac-1",
      konflikte: "1",
      ressource: "garderobe",
    });
    const href = buildPlanningHubHref(state);
    expect(href).toContain("week=2026-09-14");
    expect(href).toContain("ansicht=ressourcen");
    expect(href).toContain("typ=trainings");
    expect(href).toContain("konflikte=1");
  });

  it("preserves filters when changing week via patch", () => {
    const base = parsePlanningHubUrlState({ typ: "spiele", konflikte: "1" });
    const href = buildPlanningHubHref(base, { week: "2026-09-21" });
    expect(href).toContain("week=2026-09-21");
    expect(href).toContain("typ=spiele");
    expect(href).toContain("konflikte=1");
  });
});
