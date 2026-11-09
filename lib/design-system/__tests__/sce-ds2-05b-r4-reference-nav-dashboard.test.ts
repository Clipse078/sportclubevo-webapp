/**
 * SCE-DS2-05B-R4 — header cleanup, VEREIN label, Cham panel, programme columns.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  SCE_DS2_05B_R4_DOC_MARKERS,
  SCE_DS2_05B_R4_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-05b-r4-meta";
import { formatWideSeasonLabel } from "@/components/sce/navigation/SceGlobalSeasonSwitcher";

const ROOT = process.cwd();
const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-05B-R4 delivery", () => {
  it("documents package markers across navigation and programme surfaces", () => {
    const sources = [
      readRepo("components/admin/layout/AppShellNavigation.tsx"),
      readRepo("components/sce/navigation/SceGlobalUtilities.tsx"),
      readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx"),
      readRepo("app/(admin)/global-app-navigation.css"),
      readRepo("app/globals.css"),
      readRepo("lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts"),
    ].join("\n");
    for (const marker of SCE_DS2_05B_R4_DOC_MARKERS) {
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_05B_R4_PACKAGE_KEY).toBe("SCE-DS2-05B-R4");
  });

  it("omits season selector from global header utilities", () => {
    const utilities = readRepo("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).not.toContain("SceGlobalSeasonSwitcher");
    expect(utilities).toContain("ScePlatformBrandRail");
    expect(utilities).toContain("NotificationBell");
    expect(utilities).toMatch(/ScePlatformBrandRail[\s\S]*NotificationBell/);
  });

  it("keeps active season switching via dedicated seasons route", () => {
    const switcher = readRepo("components/sce/navigation/SceGlobalSeasonSwitcher.tsx");
    expect(switcher).toContain("/dashboard/seasons");
    expect(formatWideSeasonLabel("2026/2027", "Saison")).toContain("Saison");
  });

  it("removes dashboard customize trigger from greeting header", () => {
    const greeting = readRepo("components/ui/dashboard/PersonalDashboardCockpitGreeting.tsx");
    expect(greeting).not.toContain("PersonalDashboardCustomizeDialog");
    expect(greeting).not.toContain("personal-dashboard-customize-trigger");
    const dialog = readRepo("components/ui/dashboard/PersonalDashboardCustomizeDialog.tsx");
    expect(dialog).toContain("personal-dashboard-customize-trigger");
  });

  it("uses German VEREIN domain label without changing route domain id", () => {
    const de = JSON.parse(readRepo("messages/de.json")) as {
      AppShell: { domains: { club: string } };
    };
    expect(de.AppShell.domains.club).toBe("Verein");
    const domains = readRepo("lib/nav/app-navigation-domains.ts");
    expect(domains).toMatch(/^\s+club:\s*\{/m);
    expect(domains).not.toMatch(/^\s+verein:\s*\{/m);
  });

  it("uses integrated three-column Cham-style domain panel", () => {
    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("sce-domain-nav-panel-section-title");
    expect(panel).toContain("sce-domain-nav-panel-cham-body");
    expect(panel).toContain('data-testid="sce-domain-nav-panel-title"');
    expect(panel).not.toContain("position: fixed");
    expect(panel).not.toContain("computePanelGeometry");

    const css = readRepo("app/(admin)/global-app-navigation.css");
    expect(css).toContain(".sce-domain-nav-panel--integrated");
    expect(css).toContain(".sce-domain-nav-panel--three-column");
    expect(css).toMatch(/\.sce-domain-nav-panel-section-title[\s\S]*font-style:\s*italic/);
  });

  it("preserves canonical L2 → L3 panel behaviour and accessibility hooks", () => {
    const panel = readRepo("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain('role="navigation"');
    expect(panel).toContain("aria-expanded={selected}");
    expect(panel).toContain("aria-current");

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const items = resolveDomainSecondaryNavItems(club);
    const active = resolveActiveAppNavigation("/dashboard/org-units", model);
    const organisation = items.find((item) => item.label === "Organisation")!;
    expect(resolveDomainNavigationPanelInitialL2Key(club, items, active)).toBe(organisation.key);
    const l3 = resolveDomainPanelRightColumnEntries(club, organisation);
    expect(l3.some((child) => child.key === "org-units")).toBe(true);
  });

  it("assigns distinct programme row grid columns for date and time", () => {
    const layout = readRepo(
      "lib/sporting-activity-presentation/canonical/activity-card-reference-layout.ts",
    );
    expect(layout).toMatch(/minmax\(5\.5rem,8\.5rem\)/);
    expect(layout).toMatch(/minmax\(5\.5rem,7\.75rem\)/);

    const globals = readRepo("app/globals.css");
    expect(globals).toContain('[data-testid="sce-training-list-row-date"]');
    expect(globals).toContain('[data-testid="sce-training-list-row-time"]');
  });
});
