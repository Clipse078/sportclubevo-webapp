import { describe, expect, it } from "vitest";
import {
  buildTeamBasePath,
  buildTeamCockpitTabNavigationConfig,
} from "@/lib/teams/team-cockpit-tab-config";

const TEAM_ID = "team-abc";

describe("team cockpit tab config", () => {
  it("maps Finance-style route segments for every cockpit tab", () => {
    const config = buildTeamCockpitTabNavigationConfig({
      teamId: TEAM_ID,
      showAdministration: true,
    });
    const base = buildTeamBasePath(TEAM_ID);
    expect(config.tabRoutes?.uebersicht).toBe(base);
    expect(config.tabRoutes?.kader).toBe(`${base}/kader`);
    expect(config.tabRoutes?.spiele).toBe(`${base}/spiele`);

    const visible = config.tabs.map((t) => t.key);
    expect(
      config.resolveActiveTabFromPathname?.(`${base}/anwesenheit`, visible),
    ).toBe("anwesenheit");
    expect(config.resolveActiveTabFromPathname?.(base, visible)).toBe("uebersicht");
    expect(config.resolveActiveTabFromPathname?.(`${base}/kader/extra`, visible)).toBe("kader");
  });

  it("hides administration for read-only viewers", () => {
    const config = buildTeamCockpitTabNavigationConfig({
      teamId: TEAM_ID,
      showAdministration: false,
    });
    expect(config.tabs.some((t) => t.key === "administration")).toBe(false);
  });
});
