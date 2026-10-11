import { describe, expect, it } from "vitest";
import { buildActivityTabNavigationConfig, listAllVisibleTabs } from "../configs";

describe("SCE-ACTIVITY-NAV-01 — activity tab configs", () => {
  it("training config exposes expected primary tabs", () => {
    const config = buildActivityTabNavigationConfig({ kind: "TRAINING" });
    const keys = listAllVisibleTabs(config).map((t) => t.key);
    expect(keys).toEqual(["uebersicht", "teilnahme", "planung", "kommunikation", "mehr"]);
  });

  it("match hides Aufgebot when squad workspace unavailable", () => {
    const without = buildActivityTabNavigationConfig({
      kind: "MATCH",
      matchSquadAvailable: false,
    });
    expect(listAllVisibleTabs(without).some((t) => t.key === "aufgebot")).toBe(false);

    const withSquad = buildActivityTabNavigationConfig({
      kind: "MATCH",
      matchSquadAvailable: true,
    });
    expect(listAllVisibleTabs(withSquad).some((t) => t.key === "aufgebot")).toBe(true);
  });

  it("tournament shows Aufgebot only when squad workspace is available", () => {
    const without = buildActivityTabNavigationConfig({ kind: "TOURNAMENT" });
    expect(listAllVisibleTabs(without).some((t) => t.key === "aufgebot")).toBe(false);

    const withSquad = buildActivityTabNavigationConfig({
      kind: "TOURNAMENT",
      tournamentSquadAvailable: true,
    });
    const keys = listAllVisibleTabs(withSquad).map((t) => t.key);
    expect(keys.indexOf("aufgebot")).toBeGreaterThan(keys.indexOf("uebersicht"));
    expect(keys.indexOf("aufgebot")).toBeLessThan(keys.indexOf("teilnahme"));
  });

  it("club event uses Veranstaltung tab set without sport-specific tabs", () => {
    const config = buildActivityTabNavigationConfig({ kind: "CLUB_EVENT" });
    const keys = listAllVisibleTabs(config).map((t) => t.key);
    expect(keys).not.toContain("aufgebot");
    expect(keys).not.toContain("spielbetrieb");
  });
});
