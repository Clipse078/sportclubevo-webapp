/**
 * SCE-VISUAL-03R2 — navigation completeness + domain secondary hierarchy
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
  isSingleHubNavigationDomain,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
  resolveModuleLocalNavItems,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

const REPRESENTATIVE_PERMISSION_SETS: PermissionKey[][] = [
  CLUB_ADMIN_KEYS,
  [PERMISSIONS.TASKS_VIEW],
  [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
  [
    PERMISSIONS.ORG_VIEW,
    PERMISSIONS.ORG_MANAGE,
    PERMISSIONS.TEAMS_VIEW,
    PERMISSIONS.REGISTRATIONS_VIEW,
  ],
  [PERMISSIONS.WEBSITE_MANAGE, PERMISSIONS.NEWS_MANAGE],
];

describe("SCE-VISUAL-03R2 navigation completeness", () => {
  it("keeps every permission-visible canonical destination reachable in the domain model", () => {
    for (const permissionKeys of REPRESENTATIVE_PERMISSION_SETS) {
      const sections = getVisibleNavSections(permissionKeys, "club");
      const model = buildAppNavigationModelForUser(permissionKeys, "club");
      const report = auditNavigationCompleteness(sections, model);
      expect(report.orphanedDestinations, permissionKeys.join(",")).toEqual([]);
      expect(report.reachableDestinations).toBe(report.canonicalVisibleDestinations);
    }
  });

  it("uses compact Club L2 groups in header secondary navigation, not every destination", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club");
    expect(club).toBeTruthy();
    const secondary = resolveDomainSecondaryNavItems(club!);
    expect(secondary.length).toBeGreaterThanOrEqual(4);
    expect(secondary.length).toBeLessThanOrEqual(7);
    expect(secondary.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Organisation", "People & Teams", "Mitgliedschaft"]),
    );
    expect(secondary.map((item) => item.key)).not.toContain("org-units");
    expect(secondary.every((item) => item.headerGroupId)).toBe(true);

    const active = resolveActiveAppNavigation("/dashboard/org-units", model);
    expect(active.domainSecondaryItems.map((item) => item.headerGroupId)).toContain("organisation");
    expect(active.moduleLocalChildren.map((child) => child.key)).toContain("org-units");
    expect(active.contextualChildren.map((child) => child.key)).toContain("org-units");
  });

  it("promotes Planung hub children to domain secondary navigation", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const planning = model.domains.find((d) => d.id === "planning");
    expect(planning && isSingleHubNavigationDomain(planning)).toBe(true);
    const secondary = resolveDomainSecondaryNavItems(planning!);
    expect(secondary.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "Wochenplaner",
        "Trainings",
        "Spiele",
        "Turniere",
        "Veranstaltungen",
      ]),
    );
    const active = resolveActiveAppNavigation("/dashboard/planner/week", model);
    expect(active.domainSecondaryItems.map((item) => item.key)).toContain("wochenplanner");
    expect(resolveModuleLocalNavItems(planning!, active.activeDestination)).toEqual([]);
  });

  it("keeps Website CMS tabs module-local while Publishing header row uses publication channels", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.WEBSITE_MANAGE, PERMISSIONS.NEWS_MANAGE, PERMISSIONS.INFOBOARD_MANAGE],
      "club",
    );
    const publishing = model.domains.find((d) => d.id === "publishing");
    const secondary = resolveDomainSecondaryNavItems(publishing!);
    expect(secondary.length).toBeGreaterThanOrEqual(4);
    expect(secondary.length).toBeLessThanOrEqual(6);
    expect(secondary.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Website", "Infoboard", "Medien"]),
    );
    expect(secondary.map((item) => item.label)).not.toContain("Inhalte");
    expect(secondary.map((item) => item.key)).not.toContain("website-pages");

    const active = resolveActiveAppNavigation("/dashboard/website/pages", model);
    expect(active.activeDestinationKey).toBe("website");
    expect(active.activeDomainId).toBe("publishing");
    expect(
      active.domainSecondaryItems.some((item) => item.headerGroupId === "website"),
    ).toBe(true);
    expect(active.moduleLocalChildren.map((child) => child.key)).toContain("website-pages");
  });

  it("wires AppShell tenant row and domain panel to canonical destinations", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("domainSecondaryItems");
    expect(shellNav).toContain("moduleLocalChildren");
    expect(shellNav).toContain("SceTenantContextRow");
    expect(shellNav).toContain("SceDomainNavigationPanel");
    expect(shellNav).toContain("resolveDomainSecondaryNavItems");
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain('data-testid="sce-domain-nav-panel"');
  });

  it("exposes global navigation drawer via mobile menu without desktop hamburger", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("GlobalNavDrawer");
    expect(shellNav).toContain('data-testid="global-nav-mobile-menu"');
    const utilities = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).not.toContain("global-nav-hamburger");
    expect(shellNav).not.toContain("AdminSidebar");
    const drawer = readRelative("components/admin/layout/GlobalNavDrawer.tsx");
    expect(drawer).toContain("z-[80]");
    expect(drawer).not.toContain("AdminSidebar");
  });
});
