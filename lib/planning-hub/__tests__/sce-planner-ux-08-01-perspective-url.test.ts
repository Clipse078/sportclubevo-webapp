import { describe, expect, it } from "vitest";
import {
  buildPlanningHubHref,
  isPlanningHubResourceTimelinePerspective,
  parsePlanningHubUrlState,
  resourceCategoryForPerspective,
} from "../planner-url";

describe("SCE-PLANNER-UX-08-01 perspective URL", () => {
  it("defaults to Kalender with empty resource filter", () => {
    const state = parsePlanningHubUrlState({});
    expect(state.perspective).toBe("kalender");
    expect(state.resourceFilterIds).toBeNull();
  });

  it("round-trips Spielfeld and Garderobe perspectives", () => {
    const spielfeld = parsePlanningHubUrlState({ ansicht: "spielfeld", week: "2026-09-14" });
    expect(spielfeld.perspective).toBe("spielfeld");
    expect(spielfeld.resourceCategory).toBe("pitch");
    expect(buildPlanningHubHref(spielfeld)).toContain("ansicht=spielfeld");

    const garderobe = parsePlanningHubUrlState({ ansicht: "garderobe" });
    expect(garderobe.perspective).toBe("garderobe");
    expect(garderobe.resourceCategory).toBe("dressing");
    expect(buildPlanningHubHref(garderobe)).toContain("ansicht=garderobe");
  });

  it("maps legacy ansicht=ressourcen to Spielfeld or Garderobe", () => {
    expect(parsePlanningHubUrlState({ ansicht: "ressourcen" }).perspective).toBe("spielfeld");
    expect(parsePlanningHubUrlState({ ansicht: "ressourcen", ressource: "garderobe" }).perspective).toBe(
      "garderobe",
    );
  });

  it("preserves filters when switching Kalender → Spielfeld → Garderobe → Liste", () => {
    const base = parsePlanningHubUrlState({
      typ: "trainings",
      team: "team-f2",
      facility: "fac-brueel",
      konflikte: "1",
      week: "2026-09-28",
    });

    for (const perspective of ["spielfeld", "garderobe", "liste", "kalender"] as const) {
      const href = buildPlanningHubHref(base, { perspective });
      expect(href).toContain("typ=trainings");
      expect(href).toContain("team=team-f2");
      expect(href).toContain("facility=fac-brueel");
      expect(href).toContain("konflikte=1");
      expect(href).toContain("week=2026-09-28");
    }
  });

  it("round-trips resFilter subset", () => {
    const state = parsePlanningHubUrlState({ ansicht: "spielfeld", resFilter: "a,b" });
    expect(state.resourceFilterIds).toEqual(["a", "b"]);
    expect(buildPlanningHubHref(state)).toContain("resFilter=a%2Cb");
  });

  it("resource timeline helper aligns category with perspective", () => {
    expect(isPlanningHubResourceTimelinePerspective("spielfeld")).toBe(true);
    expect(isPlanningHubResourceTimelinePerspective("garderobe")).toBe(true);
    expect(isPlanningHubResourceTimelinePerspective("kalender")).toBe(false);
    expect(resourceCategoryForPerspective("garderobe")).toBe("dressing");
  });
});
