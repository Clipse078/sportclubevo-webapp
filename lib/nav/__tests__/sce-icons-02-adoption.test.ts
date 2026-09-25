/**
 * SCE-ICONS-02 — approved hero icons in real app navigation surfaces
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import {
  buildExplorerSearchIndex,
  filterExplorerSearchIndex,
  resolveExplorerSearchHitNavKey,
} from "@/lib/nav/app-navigation-explorer";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  getNavDestinationSceIconName,
  getQuickAccessSceIconName,
  NAV_DESTINATION_SCE_ICON_BY_KEY,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-ICONS-02 nav destination SCE mapping", () => {
  it("maps all five approved modules to registry entries with approved-master geometry", () => {
    for (const [navKey, iconName] of Object.entries(NAV_DESTINATION_SCE_ICON_BY_KEY)) {
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName].geometrySource).toBe("approved-master");
    }
  });

  it("does not map Veranstaltungen to an approved hero icon", () => {
    expect(getNavDestinationSceIconName("veranstaltungen")).toBeNull();
  });

  it("resolves quick-access stable keys for planning modules", () => {
    expect(getQuickAccessSceIconName("navigation.trainingcenter")).toBe("training");
    expect(getQuickAccessSceIconName("navigation.aufgaben")).toBeNull();
  });
});

describe("SCE-ICONS-02 application wiring", () => {
  it("uses SceIcon via NavDestinationSceIcon without duplicating SVG geometry in nav layout", () => {
    const drawer = readRelative("components/admin/layout/GlobalNavDrawer.tsx");
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    const quickAccess = readRelative("components/ui/dashboard/PersonalQuickAccess.tsx");

    expect(drawer).toContain("NavDestinationSceIcon");
    expect(drawer).not.toMatch(/public\/images\/icons\/[\w-]+\.svg/);
    expect(shell).toContain("NavDestinationSceIcon");
    expect(shell).toContain("getNavDestinationSceIconName");
    expect(quickAccess).toContain("NavDestinationSceIcon");
    expect(quickAccess).toContain("getQuickAccessSceIconName");
  });

  it("preserves permission-filtered explorer search and SCE icon nav keys", () => {
    const limited: PermissionKey[] = [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW];
    const model = buildAppNavigationModelForUser(limited, "club");
    const index = buildExplorerSearchIndex(model, (d) => d.fallbackLabel);
    const trainingHits = filterExplorerSearchIndex(index, "Train");
    expect(trainingHits.some((hit) => hit.label === "Trainings")).toBe(true);
    expect(trainingHits.some((hit) => hit.label === "Website")).toBe(false);

    const trainingHit = trainingHits.find((hit) => hit.label === "Trainings");
    expect(trainingHit).toBeTruthy();
    expect(resolveExplorerSearchHitNavKey(trainingHit!)).toBe("trainingcenter");
    expect(getNavDestinationSceIconName("trainingcenter")).toBe("training");
  });

  it("keeps navigation completeness at 60/60/0 for representative permission sets", () => {
    const sets: PermissionKey[][] = [
      CLUB_ADMIN_KEYS,
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      [PERMISSIONS.TASKS_VIEW],
    ];
    for (const permissionKeys of sets) {
      const sections = getVisibleNavSections(permissionKeys, "club");
      const model = buildAppNavigationModelForUser(permissionKeys, "club");
      const report = auditNavigationCompleteness(sections, model);
      expect(report.orphanedDestinations, permissionKeys.join(",")).toEqual([]);
      expect(report.reachableDestinations).toBe(report.canonicalVisibleDestinations);
    }
  });
});
