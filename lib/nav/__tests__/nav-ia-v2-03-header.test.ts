/**
 * SCE-NAV-IA-V2-03 — header + contextual navigation UX
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_L1_DOMAIN_ORDER,
} from "@/lib/nav/app-navigation-domains";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
  isDomainHeaderSecondaryItemActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import { buildExplorerSearchIndex } from "@/lib/nav/app-navigation-explorer";
import {
  auditRuntimeModelAgainstTargetMatrix,
  buildCurrentInventoryForPermissions,
  buildTargetMatrixFromInventory,
  computeCompletenessBaseline,
} from "@/lib/nav/nav-ia-v2";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("SCE-NAV-IA-V2-03 header experience", () => {
  it("orders Row 1 club domains canonically with Publishing and without Organisation L1", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const clubL1 = model.domains
      .filter((d) => CLUB_L1_DOMAIN_ORDER.includes(d.id as (typeof CLUB_L1_DOMAIN_ORDER)[number]))
      .map((d) => d.id);
    expect(clubL1).toEqual([...CLUB_L1_DOMAIN_ORDER]);
    expect(model.domains.some((d) => d.id === "organisation")).toBe(false);
    expect(model.domains.some((d) => d.id === "publishing")).toBe(true);
  });

  it("derives Row 2 from canonical metadata without dashboard filler row", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const dashboard = model.domains.find((d) => d.id === "dashboard");
    expect(resolveDomainSecondaryNavItems(dashboard!)).toEqual([]);

    const activeDashboard = resolveActiveAppNavigation("/dashboard", model);
    expect(activeDashboard.domainSecondaryItems).toEqual([]);
  });

  it("limits Club header Row 2 to header-visible L2 groups", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const secondary = resolveDomainSecondaryNavItems(club);
    expect(secondary.length).toBeGreaterThanOrEqual(4);
    expect(secondary.length).toBeLessThanOrEqual(6);
    expect(secondary.some((item) => item.label === "Administration")).toBe(false);
    expect(secondary.every((item) => item.headerGroupId)).toBe(true);
  });

  it("limits Publishing header Row 2 while keeping Infoboard discoverable via Kanäle group", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.WEBSITE_MANAGE, PERMISSIONS.INFOBOARD_MANAGE],
      "club",
    );
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const secondary = resolveDomainSecondaryNavItems(publishing);
    expect(secondary.some((item) => item.headerGroupId === "kanaele")).toBe(true);
    expect(secondary.some((item) => item.label === "Einstellungen")).toBe(false);

    const index = buildExplorerSearchIndex(model, (d) => d.fallbackLabel);
    expect(index.some((hit) => hit.key === "infoboard")).toBe(true);
  });

  it("resolves deep-route active L1 and contextual Row 2 parents from the model", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const samples: Array<[string, string, string | undefined]> = [
      ["/dashboard", "dashboard", undefined],
      ["/dashboard/planner/week", "planning", "planung"],
      ["/dashboard/org-units", "club", "organisation"],
      ["/dashboard/teams/abc", "club", "organisation"],
      ["/dashboard/website", "publishing", "website"],
      ["/dashboard/website/pages/abc", "publishing", "website"],
      ["/dashboard/infoboard/preview", "publishing", "infoboard"],
    ];

    for (const [pathname, domainId, destinationKey] of samples) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe(domainId);
      if (destinationKey) {
        expect(active.activeDestinationKey, pathname).toBe(destinationKey);
      }
    }

    const planningActive = resolveActiveAppNavigation("/dashboard/planner/week", model);
    expect(planningActive.domainSecondaryItems.map((item) => item.key)).toContain("wochenplanner");

    const club = model.domains.find((d) => d.id === "club")!;
    const orgUnitsActive = resolveActiveAppNavigation("/dashboard/org-units", model);
    const orgHeaderItem = orgUnitsActive.domainSecondaryItems.find(
      (item) => item.headerGroupId === "organisation",
    );
    expect(orgHeaderItem).toBeTruthy();
    expect(
      isDomainHeaderSecondaryItemActive(
        "/dashboard/org-units",
        club,
        orgHeaderItem!,
        orgUnitsActive.activeDestinationKey,
      ),
    ).toBe(true);
  });

  it("filters Row 1 and Row 2 by permissions without broadening access", () => {
    const planningOnly = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    expect(planningOnly.domains.some((d) => d.id === "planning")).toBe(true);
    expect(planningOnly.domains.some((d) => d.id === "publishing")).toBe(false);
    const planningDomain = planningOnly.domains.find((d) => d.id === "planning")!;
    expect(resolveDomainSecondaryNavItems(planningDomain).length).toBeGreaterThan(0);

    const tasksOnly = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    expect(tasksOnly.domains.some((d) => d.id === "publishing")).toBe(false);
    const communicationDomain = tasksOnly.domains.find((d) => d.id === "communication")!;
    expect(resolveDomainSecondaryNavItems(communicationDomain).length).toBeGreaterThan(0);

    const publishingOnly = buildAppNavigationModelForUser(
      [PERMISSIONS.WEBSITE_MANAGE, PERMISSIONS.INFOBOARD_MANAGE],
      "club",
    );
    expect(publishingOnly.domains.some((d) => d.id === "publishing")).toBe(true);
    expect(publishingOnly.domains.some((d) => d.id === "planning")).toBe(false);
    const publishingDomain = publishingOnly.domains.find((d) => d.id === "publishing")!;
    expect(resolveDomainSecondaryNavItems(publishingDomain).length).toBeGreaterThan(0);
  });

  it("does not render empty contextual Row 2 for authorized domains", () => {
    for (const permissionKeys of [
      CLUB_ADMIN_KEYS,
      [PERMISSIONS.TRAININGS_VIEW],
      [PERMISSIONS.WEBSITE_MANAGE],
    ] as PermissionKey[][]) {
      const model = buildAppNavigationModelForUser(permissionKeys, "club");
      for (const domain of model.domains) {
        if (domain.id === "dashboard") {
          expect(resolveDomainSecondaryNavItems(domain)).toEqual([]);
          continue;
        }
        expect(resolveDomainSecondaryNavItems(domain).length).toBeGreaterThan(0);
      }
    }
  });

  it("wires AppShell Row 1 from the navigation model with L1 SCE icons", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("buildAppNavigationModelForUser");
    expect(shell).not.toMatch(/domains:\s*\[\s*["']dashboard["']/);
    expect(shell).toContain("l1SceIconKey");
    expect(shell).toContain("domainSecondaryItems");
  });

  it("maintains 60/60/0 completeness and V2-02 matrix parity", () => {
    const baseline = computeCompletenessBaseline(CLUB_ADMIN_KEYS, "club");
    expect(baseline.visibleDestinations).toBe(60);
    expect(baseline.reachableDestinations).toBe(60);
    expect(baseline.orphanedDestinations).toEqual([]);

    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const matrix = buildTargetMatrixFromInventory(
      buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club"),
    );
    const audit = auditRuntimeModelAgainstTargetMatrix(sections, model, matrix);
    expect(audit.mismatches).toEqual([]);
    expect(audit.unmapped).toEqual([]);

    const report = auditNavigationCompleteness(sections, model);
    expect(report.orphanedDestinations).toEqual([]);
  });

  it("uses compact shared shell styles for Row 1 and Row 2 density targets", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("--topnav-height: 4rem");
    expect(css).toContain("sce-global-context-nav-item--active");
    expect(css).toContain("border-bottom-color: var(--sce-primary)");
  });
});
