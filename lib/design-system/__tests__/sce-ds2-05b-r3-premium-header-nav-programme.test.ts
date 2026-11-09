/**
 * SCE-DS2-05B-R3 — premium header, three-level navigation, single-line programme cards.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  SCE_DS2_05B_R3_DOC_MARKERS,
  SCE_DS2_05B_R3_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-r3-meta";
import { sportingActivityTypePillClassName } from "@/lib/sporting-activity-presentation/activity-type-pill";

const ROOT = process.cwd();
const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R3 delivery", () => {
  it("documents package markers across header, navigation, and programme surfaces", () => {
    const sources = [
      readRepo("components/admin/layout/AppShellNavigation.tsx"),
      readRepo("components/sce/navigation/SceHierarchicalDesktopNavigation.tsx"),
      readRepo("components/sce/navigation/SceGlobalUtilities.tsx"),
      readRepo("app/(admin)/global-app-navigation.css"),
      readRepo("app/globals.css"),
      readRepo("lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_R3_DOC_MARKERS) {
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_R3_PACKAGE_KEY).toBe("SCE-DS2-05B-R3");
  });

  it("renders dominant tenant identity typography and header-primary layout", () => {
    const identity = readRepo("components/admin/layout/HeaderTenantIdentity.tsx");
    expect(identity).toContain("tenant-header-primary");
    expect(identity).toContain("sce-tenant-header-identity-name");
    const rail = readRepo("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(rail).toContain('layout={compact ? "under-product-compact" : "tenant-header-primary"}');
    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(/\.sce-tenant-header-identity-name[\s\S]*font-weight:\s*800/);
    expect(css).toMatch(/\.sce-tenant-header-identity-name[\s\S]*font-style:\s*italic/);
  });

  it("places theme-aware SCE wordmark in Row 1 utilities before notifications", () => {
    const utilities = readRepo("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).toContain("sce-global-header-platform-brand");
    expect(utilities).toContain("ScePlatformBrandRail");
    expect(utilities).toContain("NotificationBell");
    expect(utilities).toMatch(/ScePlatformBrandRail[\s\S]*NotificationBell/);
    expect(utilities).toContain("SceGlobalSeasonSwitcher");
  });

  it("shows persistent L2/L3 desktop hierarchy from canonical navigation", () => {
    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceHierarchicalDesktopNavigation");
    expect(shell).not.toContain("SceRow2SeasonContext");

    const hierarchical = readRepo("components/sce/navigation/SceHierarchicalDesktopNavigation.tsx");
    expect(hierarchical).toContain("sce-global-domain-section-heading");
    expect(hierarchical).toContain('level="context"');

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const items = resolveDomainSecondaryNavItems(club);
    const active = resolveActiveAppNavigation("/dashboard/org-units", model);
    const initialL2 = resolveDomainNavigationPanelInitialL2Key(club, items, active);
    const organisation = items.find((item) => item.label === "Organisation");
    expect(initialL2).toBe(organisation?.key);
    const l3 = resolveSecondaryNavItemModuleLocalChildren(club, organisation!);
    expect(l3.some((child) => child.key === "org-units")).toBe(true);
  });

  it("uses single-line dashboard programme row grid with semantic activity pills", () => {
    const layout = readRepo(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).toContain("sce-activity-dashboard-programme-row");
    expect(layout).toContain("trainingReferenceActivityCellClass");
    expect(layout).toMatch(/whitespace-nowrap/);

    const training = readRepo("components/sporting-activity/SceTrainingCard.tsx");
    expect(training).toContain("sce-training-list-row-activity");
    expect(training).toContain("ActivityTypePill");

    const trainingPill = sportingActivityTypePillClassName("training-blue");
    expect(trainingPill).toContain("rounded-full");
  });

  it("omits empty Row 2 season-only shell on dashboard home", () => {
    const shell = readRepo("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toMatch(
      /active\.activeDomainId !== "dashboard"[\s\S]*SceHierarchicalDesktopNavigation/,
    );
  });
});
