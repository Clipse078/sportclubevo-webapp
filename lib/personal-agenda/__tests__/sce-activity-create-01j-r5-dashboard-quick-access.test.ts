import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { buildQuickAccessCatalog } from "@/lib/dashboard/quick-access/build-catalog";
import { navigationStableKey } from "@/lib/dashboard/quick-access/constants";
import { filterStoredKeysToAuthorized } from "@/lib/dashboard/quick-access/validation";
import {
  resolveSceActivityCreatePermissionsFromFlags,
  sceActivityCreatePermissionsHasAny,
} from "@/lib/sce/activity-create/activity-create-permissions";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("SCE-ACTIVITY-CREATE-01J R5 — Dashboard Schnellzugriff + Erstellen", () => {
  it("quick access catalog is navigation-only with canonical workspace routes", () => {
    const catalog = buildQuickAccessCatalog({
      permissionKeys: [
        PERMISSIONS.EVENTS_VIEW,
        PERMISSIONS.EVENTS_MANAGE,
        PERMISSIONS.TRAININGS_MANAGE,
        PERMISSIONS.WOCHENPLAN_MANAGE,
      ],
      navCapabilities: { personalActionsModule: false },
    });

    const navItemKeys = catalog.map((e) => e.navItemKey).filter(Boolean);
    expect(navItemKeys).toContain("wochenplanner");
    expect(navItemKeys).toContain("trainingcenter");
    expect(navItemKeys).toContain("matchcenter");
    expect(navItemKeys).toContain("vereinsprogramm");
    expect(navItemKeys).toContain("tournamentcenter");
    expect(navItemKeys).not.toContain("planung");
    expect(catalog.some((e) => e.key.startsWith("action.create-"))).toBe(false);

    const wochenplan = catalog.find((e) => e.navItemKey === "wochenplanner");
    expect(wochenplan?.href).toBe("/dashboard/planner/week");
    const spiele = catalog.find((e) => e.navItemKey === "matchcenter");
    expect(spiele?.href).toBe("/dashboard/matchcenter");
  });

  it("drops stale create pins from stored preferences", () => {
    const allowed = new Set([
      navigationStableKey("matchcenter"),
      navigationStableKey("trainingcenter"),
    ]);
    const filtered = filterStoredKeysToAuthorized(
      ["action.create-match", navigationStableKey("matchcenter")],
      allowed,
    );
    expect(filtered).toEqual([navigationStableKey("matchcenter")]);
  });

  it("wires canonical SceActivityCreateMenu on dashboard command center", () => {
    const asyncCenter = read("components/admin/dashboard/ClubDashboardCommandCenterAsync.tsx");
    expect(asyncCenter).toContain("SceActivityCreateMenu");
    expect(asyncCenter).toContain('presentation="dashboard-strip"');
    expect(asyncCenter).toContain('kind: "DASHBOARD"');
    expect(asyncCenter).toContain("buildSceActivityCreateMenuProps");
    expect(asyncCenter).not.toMatch(/DashboardActivityCreateMenu|DashboardCreateModal/);
  });

  it("PersonalQuickAccess separates navigation links from createMenu slot", () => {
    const quickAccess = read("components/ui/dashboard/PersonalQuickAccess.tsx");
    expect(quickAccess).toContain("createMenu");
    expect(quickAccess).toContain('item.kind === "navigate"');
    expect(quickAccess).not.toContain('kind === "create"');
  });

  it("respects permission-aware activity create flags", () => {
    const none = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings: false,
      canManageEvents: false,
    });
    expect(sceActivityCreatePermissionsHasAny(none)).toBe(false);

    const trainingOnly = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings: true,
      canManageEvents: false,
    });
    expect(trainingOnly.training).toBe(true);
    expect(trainingOnly.match).toBe(false);

    const events = resolveSceActivityCreatePermissionsFromFlags({
      canManageTrainings: false,
      canManageEvents: true,
    });
    expect(events.match).toBe(true);
    expect(events.tournament).toBe(true);
    expect(events.veranstaltung).toBe(true);
  });
});

describe("SCE-ACTIVITY-CREATE-01J R5 — R2/R4/Navbar regression sentinels", () => {
  it("preserves Mein Programm route and dashboard programme workspace", () => {
    const meinProgramm = read("app/(admin)/dashboard/mein-programm/page.tsx");
    expect(meinProgramm).toContain("/dashboard/mein-programm");
    expect(meinProgramm).toContain("ProgrammeViewSwitcher");
    expect(meinProgramm).toContain("parseMeinProgrammUrlState");
  });

  it("preserves R4 three-row card and calendar preview contracts", () => {
    const r4 = read("lib/personal-agenda/__tests__/sce-activity-create-01j-r4-card-calendar.test.tsx");
    expect(r4).toContain("listRowPresentation");
    expect(r4).toContain("showSelectedDayPanel={false}");
    const workspace = read("components/ui/dashboard/PersonalDashboardWorkspace.tsx");
    expect(workspace).toContain("DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT");
  });

  it("preserves navbar shell markers on dashboard page", () => {
    const club = read("components/admin/dashboard/ClubDashboardView.tsx");
    expect(club).toContain("sce-page-shell--dashboard");
    expect(club).not.toContain("DashboardL1");
  });
});
