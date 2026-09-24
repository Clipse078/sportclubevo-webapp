import { describe, expect, it } from "vitest";
import { deriveDefaultQuickAccessKeys } from "../defaults";
import type { QuickAccessCatalogEntry } from "../types";

const sampleCatalog: QuickAccessCatalogEntry[] = [
  {
    key: "navigation.wochenplanner",
    kind: "NAVIGATION",
    href: "/dashboard/planner/week",
    iconLabel: "Wochenplaner",
    messageKey: "x",
    navItemKey: "wochenplanner",
    permissionKeys: [],
    defaultPriority: 90,
  },
  {
    key: "navigation.aufgaben",
    kind: "NAVIGATION",
    href: "/dashboard/aufgaben",
    iconLabel: "Aufgaben",
    messageKey: "x",
    navItemKey: "aufgaben",
    permissionKeys: [],
    defaultPriority: 80,
  },
  {
    key: "action.create-training",
    kind: "CREATE_ACTION",
    href: "/dashboard/events/trainings/new",
    iconLabel: "Training",
    messageKey: "x",
    permissionKeys: [],
    defaultPriority: 40,
  },
];

describe("DASHBOARD-04 — quick access defaults", () => {
  it("returns deterministic defaults capped at max pins", () => {
    const first = deriveDefaultQuickAccessKeys(sampleCatalog, null);
    const second = deriveDefaultQuickAccessKeys(sampleCatalog, null);
    expect(first).toEqual(second);
    expect(first.length).toBeLessThanOrEqual(8);
    expect(first.length).toBeGreaterThan(0);
  });

  it("boosts team-related navigation when personal context has teams", () => {
    const withTeams = deriveDefaultQuickAccessKeys(sampleCatalog, {
      tenantId: "t",
      userId: "u",
      personId: "p",
      hasLinkedPerson: true,
      hasActiveTenantMembership: true,
      teams: [
        {
          teamId: "team-1",
          teamName: "F1",
          kinds: ["TRAINER"],
          assignmentFunctionKeys: [],
          teamSeasonIds: [],
        },
      ],
      orgUnits: [],
      assignments: [],
    });
    expect(withTeams.indexOf("navigation.wochenplanner")).toBeLessThan(
      withTeams.indexOf("navigation.aufgaben"),
    );
  });
});
