/**
 * SCE-NAVBAR-UPGRADE-01-R9 — tenant bar + hierarchical domain navigation panel
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolveDesktopPrimaryNavigationDomains,
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainNavigationPanelUsesHierarchy,
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-NAVBAR-UPGRADE-01-R9 hierarchical domain panel", () => {
  it("keeps persistent tenant Row 2 without desktop horizontal L2 strip", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("SceTenantContextRow");
    expect(shell).not.toContain("SceModuleNavigation");
    expect(shell).not.toContain("showDomainModuleNav");
    expect(shell).toContain("SceDomainNavigationPanel");

    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).not.toMatch(/\.sce-global-module-nav-track[\s\S]*overflow-x:\s*auto/);
  });

  it("opens domain navigation from L1 disclosures using canonical secondary items", () => {
    const primary = readRelative("components/sce/navigation/ScePrimaryNavigation.tsx");
    expect(primary).toContain("PrimaryDomainTrigger");
    expect(primary).toContain("aria-expanded={isOpen}");
    expect(primary).toContain("domainHasNavigationPanel");

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const planning = model.domains.find((d) => d.id === "planning")!;
    const club = model.domains.find((d) => d.id === "club")!;
    expect(resolveDomainSecondaryNavItems(planning).some((i) => i.key === "wochenplanner")).toBe(
      true,
    );
    expect(resolveDomainSecondaryNavItems(club).some((i) => i.label === "Organisation")).toBe(true);
  });

  it("renders simple vs hierarchical panel modes from canonical L3 depth", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const planning = model.domains.find((d) => d.id === "planning")!;
    const club = model.domains.find((d) => d.id === "club")!;
    const planningItems = resolveDomainSecondaryNavItems(planning);
    const clubItems = resolveDomainSecondaryNavItems(club);

    expect(resolveDomainNavigationPanelUsesHierarchy(planning, planningItems)).toBe(false);
    expect(resolveDomainNavigationPanelUsesHierarchy(club, clubItems)).toBe(true);

    const organisation = clubItems.find((item) => item.label === "Organisation")!;
    const l3 = resolveDomainPanelRightColumnEntries(club, organisation);
    expect(l3[0]?.label).toBe("Organisation Übersicht");
    expect(l3.some((child) => child.key === "org-units")).toBe(true);
  });

  it("resolves active L2 focus for open panel from active route", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const items = resolveDomainSecondaryNavItems(club);
    const active = resolveActiveAppNavigation("/dashboard/org-units", model);
    const initial = resolveDomainNavigationPanelInitialL2Key(club, items, active);
    const organisation = items.find((item) => item.label === "Organisation");
    expect(initial).toBe(organisation?.key);
  });

  it("documents panel overlay semantics and forbids horizontal nav overflow in design system", () => {
    const design = readRelative("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(design).toContain("SceDomainNavigationPanel");
    expect(design).toContain("Do not use horizontally scrolling navigation");
    expect(design).toContain("one coherent hierarchical navigation surface");
    expect(design).toContain("never create additional persistent shell rows");
  });

  it("preserves R8 shell and page grid guards", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("resolveDesktopPrimaryNavigationDomains");
    expect(shell).toContain('resolveHref("/dashboard")');

    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("--sce-page-gutter");
    expect(css).toContain("sce-domain-nav-panel");
  });

  it("keeps dashboard absent from desktop L1 while route model remains", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const desktop = resolveDesktopPrimaryNavigationDomains(model.domains, "club");
    expect(desktop.some((d) => d.id === "dashboard")).toBe(false);
    expect(model.domains.some((d) => d.id === "dashboard")).toBe(true);
  });

  it("does not introduce binary checkbox controls in navigation package", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(panel).not.toContain('type="checkbox"');
    expect(shell).not.toContain('type="checkbox"');
  });
});
