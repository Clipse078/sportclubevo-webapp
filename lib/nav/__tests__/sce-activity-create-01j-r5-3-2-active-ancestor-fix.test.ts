/**
 * SCE-ACTIVITY-CREATE-01J-R5.3.2 — Active route ancestry (L2 ancestor + chevron contract)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  isDomainHeaderSecondaryItemActive,
  isDomainPanelSecondaryItemRouteActive,
  isModuleLocalChildPrimaryActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const repoRoot = process.cwd();
const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

function readRelative(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function panelL2RouteActive(
  pathname: string,
  active: ReturnType<typeof resolveActiveAppNavigation>,
  label: string,
): boolean {
  if (!active.activeDomain) return false;
  const item = active.domainSecondaryItems.find((entry) => entry.label === label);
  if (!item) return false;
  return isDomainPanelSecondaryItemRouteActive(
    pathname,
    active.activeDomain,
    item,
    active.activeDestinationKey,
    active.activeChildKey,
    active.domainSecondaryItems,
  );
}

describe("SCE-ACTIVITY-CREATE-01J-R5.3.2 — PO UAT Club → Organisation → Teams", () => {
  const pathname = "/dashboard/teams/team-po-uat-01/programm";

  it("resolves canonical route state for team programm", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("club");
    expect(active.activeDestinationKey).toBe("teams");
    expect(active.activeChildKey).toBe(null);
  });

  it("marks Personen & Teams as active L2 ancestor for team programm routes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation(pathname, model);

    expect(panelL2RouteActive(pathname, active, "Personen & Teams")).toBe(true);
    expect(panelL2RouteActive(pathname, active, "Organisation")).toBe(false);
  });

  it("resolves provider-mapping under Administration (longest href wins over Teams prefix)", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathnameOverlap = "/dashboard/teams/provider-mapping";
    const active = resolveActiveAppNavigation(pathnameOverlap, model);
    const admin = model.domains.find((d) => d.id === "admin")!;
    const items = active.domainSecondaryItems;
    const integrationen = items.find((item) => item.label === "Integrationen & Zuordnungen")!;

    expect(active.activeDomainId).toBe("admin");
    expect(active.activeDestinationKey).toBe("provider-mapping");

    expect(
      isDomainHeaderSecondaryItemActive(
        pathnameOverlap,
        admin,
        integrationen,
        active.activeDestinationKey,
        active.activeChildKey,
        items,
      ),
    ).toBe(true);
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3.2 — browse vs active", () => {
  it("browsed L2 branch does not become route-active; ancestor stays active", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/teams/abc123/programm";
    const active = resolveActiveAppNavigation(pathname, model);

    const browsedL2Key = "people-teams";
    expect(browsedL2Key).not.toBe(active.activeDestinationKey);

    expect(panelL2RouteActive(pathname, active, "Personen & Teams")).toBe(true);
    expect(panelL2RouteActive(pathname, active, "Organisation")).toBe(false);

    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("selected && \"sce-domain-nav-panel-l2-control--selected\"");
    expect(panel).not.toMatch(/\(active \|\| selected\) && "sce-domain-nav-panel-l2-control--active"/);
    expect(panel).toContain('active={active}');
    expect(panel).not.toContain("active={active || selected}");
    expect(browsedL2Key).toBeTruthy();
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3.2 — L2 chevron + L3 visual contract", () => {
  it("styles chevron from the same route-active L2 state as icon and label", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-control--active[\s\S]*\.sce-domain-nav-panel-l2-chevron[\s\S]*var\(--sce-primary\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-l3-link--active[\s\S]*color:\s*var\(--sce-primary\)/);
  });

  it("hierarchical L2 disclosure rows do not claim aria-current on ancestors", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain("sce-domain-nav-panel-l2-chevron");
    expect(panel).not.toMatch(
      /hierarchical && hasL3[\s\S]*aria-current=\{active \? "true"/,
    );
  });

  it("leaf L3 links keep aria-current=page", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain('aria-current={active ? "page" : undefined}');
  });
});
