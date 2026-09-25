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

  it("uses domain destinations for Organisation secondary navigation, not module-local children", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const org = model.domains.find((d) => d.id === "organisation");
    expect(org).toBeTruthy();
    const secondary = resolveDomainSecondaryNavItems(org!);
    expect(secondary.map((item) => item.key)).toEqual(
      expect.arrayContaining(["organisation", "mitglieder", "anmeldungen", "trainer-staff"]),
    );
    expect(secondary.map((item) => item.key)).not.toContain("org-units");

    const active = resolveActiveAppNavigation("/dashboard/org-units", model);
    expect(active.domainSecondaryItems.map((item) => item.key)).toEqual(
      expect.arrayContaining(["organisation", "mitglieder"]),
    );
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

  it("keeps Website CMS tabs module-local while Club destinations stay in the secondary row", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.WEBSITE_MANAGE, PERMISSIONS.NEWS_MANAGE, PERMISSIONS.INFOBOARD_MANAGE],
      "club",
    );
    const club = model.domains.find((d) => d.id === "club");
    const secondary = resolveDomainSecondaryNavItems(club!);
    expect(secondary.map((item) => item.key)).toEqual(
      expect.arrayContaining(["website", "infoboard"]),
    );
    expect(secondary.map((item) => item.key)).not.toContain("website-pages");

    const active = resolveActiveAppNavigation("/dashboard/website/pages", model);
    expect(active.activeDestinationKey).toBe("website");
    expect(active.domainSecondaryItems.map((item) => item.key)).toContain("website");
    expect(active.moduleLocalChildren.map((child) => child.key)).toContain("website-pages");
  });

  it("wires AppShell secondary row to domain destinations", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("domainSecondaryItems");
    expect(shellNav).toContain("moduleLocalChildren");
    expect(shellNav).toContain('data-testid="domain-secondary-nav"');
    expect(shellNav).toContain('data-testid="module-local-nav"');
  });

  it("exposes global navigation drawer on all breakpoints", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("GlobalNavDrawer");
    expect(shellNav).toContain('data-testid="global-nav-hamburger"');
    expect(shellNav).not.toContain("AdminSidebar");
    const drawer = readRelative("components/admin/layout/GlobalNavDrawer.tsx");
    expect(drawer).toContain("z-[80]");
    expect(drawer).not.toContain("AdminSidebar");
  });
});
