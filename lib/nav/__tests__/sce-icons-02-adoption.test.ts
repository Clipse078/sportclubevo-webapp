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
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { CANONICAL_SHELL_NAV_SCE_ICON_SURFACES } from "@/lib/nav/nav-test-contract";
import {
  expectNavDestinationUsesRegistryMaster,
  forEachNavDestinationIconMapping,
} from "@/lib/nav/__tests__/nav-test-assertions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-ICONS-02 nav destination SCE mapping", () => {
  it("maps adopted nav destinations to registry entries with approved-master geometry", () => {
    forEachNavDestinationIconMapping((navKey, iconName) => {
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expectNavDestinationUsesRegistryMaster(iconName);
    });
  });

  it("maps Veranstaltungen to the approved events master (SCE-ICONS-10)", () => {
    expect(getNavDestinationSceIconName("veranstaltungen")).toBe("events");
  });

  it("resolves quick-access stable keys for planning modules", () => {
    expect(getQuickAccessSceIconName("navigation.trainingcenter")).toBe("training");
    expect(getQuickAccessSceIconName("navigation.aufgaben")).toBe("tasks");
  });
});

describe("SCE-ICONS-02 application wiring", () => {
  it("uses SceIcon via NavDestinationSceIcon without duplicating SVG geometry in nav layout", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    for (const relativePath of CANONICAL_SHELL_NAV_SCE_ICON_SURFACES) {
      const source = readRelative(relativePath);
      expect(source).toContain("NavDestinationSceIcon");
      expect(source).not.toMatch(/public\/images\/icons\/[\w-]+\.svg/);
    }
    expect(shell).toContain("SceDomainNavigationPanel");
    expect(readRelative("components/ui/dashboard/PersonalQuickAccess.tsx")).toContain(
      "getQuickAccessSceIconName",
    );
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
