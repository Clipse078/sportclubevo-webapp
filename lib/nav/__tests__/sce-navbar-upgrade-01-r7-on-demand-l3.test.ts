/**
 * SCE-NAVBAR-UPGRADE-01-R7 — two-row navigation + on-demand L3 + logo/tenant home
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolveDesktopPrimaryNavigationDomains,
  resolveDomainSecondaryNavItems,
  resolvePrimaryDomainPresentation,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-NAVBAR-UPGRADE-01-R7 on-demand L3 and home navigation", () => {
  it("removes dashboard from desktop primary row domains while keeping the route model", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const desktopPrimary = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    expect(desktopPrimary.some((d) => d.id === "dashboard")).toBe(false);
    expect(model.domains.some((d) => d.id === "dashboard")).toBe(true);

    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("resolveDesktopPrimaryNavigationDomains");
    expect(shell).not.toMatch(/SceContextNavigation[\s\S]*moduleLocalChildren/);
  });

  it("links SportClubEvo and tenant identity to the canonical dashboard route", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain('homeHref={homeHref}');
    expect(shell).toContain('resolveHref("/dashboard")');

    const brand = readRelative("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(brand).toContain("sce-platform-home-link");
    expect(brand).toContain("Zum Dashboard");

    const tenant = readRelative("components/admin/layout/HeaderTenantIdentity.tsx");
    expect(tenant).toContain("sce-tenant-home-link");
  });

  it("keeps Row 2 on dashboard with empty L2 workspace and avoids false L1 active domain", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation("/dashboard", model);
    expect(active.activeDomainId).toBe("dashboard");
    expect(active.domainSecondaryItems).toEqual([]);
    expect(active.moduleLocalChildren).toEqual([]);

    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceTenantContextRow");
    expect(shell).toContain("SceDomainNavigationPanel");
    expect(shell).toContain('if (active.activeDomainId === "dashboard") return false');
  });

  it("derives L3 children from the canonical model for Row 2 parents", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const organisation = resolveDomainSecondaryNavItems(club).find((item) => item.label === "Organisation");
    expect(organisation).toBeTruthy();
    const l3 = resolveSecondaryNavItemModuleLocalChildren(club, organisation!);
    expect(l3.some((child) => child.key === "teams")).toBe(true);
    expect(l3.some((child) => child.key === "org-units")).toBe(true);
  });

  it("uses hierarchical domain panel instead of permanent Row 3 or horizontal L2 strip", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("sce-domain-nav-panel");
    expect(panel).toContain("resolveDomainPanelRightColumnEntries");

    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("sce-domain-nav-panel");
    expect(css).not.toContain("--sce-nav-context-row-height");
    expect(css).not.toContain(".sce-global-context-nav {");
  });

  it("keeps Row 1 width-priority utilities responsive without overlap architecture", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("sce-global-season-switcher--compact");
    expect(css).toMatch(/@media \(max-width: 1279px\)[\s\S]*sce-global-primary-nav-item/);

    const utilities = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).toContain('displayMode="wide"');
    expect(utilities).toContain('displayMode="medium"');
    expect(utilities).toContain('displayMode="icon"');
    expect(utilities).toContain("data-sce-utilities-tier");
  });

  it("fits functional L1 domains after dashboard removal at laptop tier", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const primary = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    const presentation = resolvePrimaryDomainPresentation(primary, "planning", 5);
    expect(presentation.overflowDomains).toEqual([]);
    expect(presentation.inlineDomains.map((d) => d.id)).toEqual([
      "planning",
      "communication",
      "club",
      "publishing",
      "admin",
    ]);
  });
});
