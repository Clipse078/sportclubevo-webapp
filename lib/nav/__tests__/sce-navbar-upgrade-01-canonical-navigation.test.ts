/**
 * SCE-NAVBAR-UPGRADE-01 — canonical navigation architecture regression
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolvePrimaryDomainPresentation,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-NAVBAR-UPGRADE-01 canonical navigation", () => {
  it("wires AppShell through sce/navigation primitives", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("ScePrimaryNavigation");
    expect(shell).toContain("SceModuleNavigation");
    expect(shell).toContain("SceContextNavigation");
    expect(shell).toContain("SceGlobalUtilities");
    expect(shell).toContain("SceTenantIdentityBar");
    expect(shell).toContain("showGlobalNavExplorer");
  });

  it("uses distinct L1/L2/L3 style contracts in global navigation CSS", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toContain("sce-global-primary-nav-item--active");
    expect(css).toContain("sce-global-module-nav-item--active");
    expect(css).toContain("sce-global-context-nav-item--active");
    expect(css).toContain("--topnav-height: 4.5rem");
    expect(css).toContain("sce-global-brand-tenant-stack");
    expect(css).not.toContain("backdrop-filter: blur");
  });

  it("maps module vs context nav landmarks to the correct aria labels", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain('ariaLabel={t("moduleNavAria")}');
    expect(shell).toContain('ariaLabel={t("contextNavAria")}');
  });

  it("resolves primary, module, and contextual active routes for Programme continuity", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const programme = resolveActiveAppNavigation("/dashboard/programm", model);
    expect(programme.activeDomainId).toBe("planning");
    expect(programme.activeDestinationKey).toBe("planung");
    expect(programme.domainSecondaryItems.some((item) => item.key === "vereinsprogramm")).toBe(true);

    expect(readRelative("app/(admin)/dashboard/kalender/page.tsx")).toContain("PersonalKalender");
    expect(readRelative("app/(admin)/dashboard/programm/page.tsx")).toContain("ProgrammeViewSwitcher");

    const week = resolveActiveAppNavigation("/dashboard/planner/week", model);
    expect(week.activeDomainId).toBe("planning");
    expect(week.domainSecondaryItems.some((item) => item.key === "wochenplanner")).toBe(true);

    const training = resolveActiveAppNavigation("/dashboard/training", model);
    expect(training.activeDomainId).toBe("planning");

    const match = resolveActiveAppNavigation("/dashboard/matchcenter", model);
    expect(match.activeDomainId).toBe("planning");

    const tournament = resolveActiveAppNavigation("/dashboard/tournamentcenter", model);
    expect(tournament.activeDomainId).toBe("planning");

    const veranstaltungen = resolveActiveAppNavigation("/dashboard/veranstaltungen", model);
    expect(veranstaltungen.activeDomainId).toBe("planning");

    expect(readRelative("app/(admin)/dashboard/users/page.tsx").length).toBeGreaterThan(0);
    const adminNav = resolveActiveAppNavigation("/dashboard/admin/branding", model);
    expect(adminNav.activeDomainId).toBe("admin");

    const communication = resolveActiveAppNavigation("/dashboard/communication/mitteilungen", model);
    expect(communication.activeDomainId).toBe("communication");

    const teamContext = resolveActiveAppNavigation("/dashboard/teams/abc123", model);
    expect(teamContext.activeDomainId).toBe("club");
  });

  it("promotes active overflow domain without duplicating inline destinations", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation("/dashboard/sponsoring", model);
    const presentation = resolvePrimaryDomainPresentation(model.domains, active.activeDomainId, 4);
    const inlineIds = presentation.inlineDomains.map((d) => d.id);
    const overflowIds = presentation.overflowDomains.map((d) => d.id);
    expect(inlineIds.some((id) => overflowIds.includes(id))).toBe(false);
    expect(inlineIds).toContain("club");
  });

  it("stacks tenant identity under the SCE product wordmark", () => {
    const tenantBar = readRelative("components/sce/navigation/SceTenantIdentityBar.tsx");
    expect(tenantBar).toContain("sce-global-brand-tenant-stack");
    expect(tenantBar).not.toContain("sce-product-tenant-separator");
    expect(tenantBar).toContain('layout="under-product"');
    expect(tenantBar).toContain("data-tenant-under-sce=");
  });

  it("uses header-crest tenant treatment without legacy navbar season pills", () => {
    const tenant = readRelative("components/admin/layout/HeaderTenantIdentity.tsx");
    expect(tenant).toContain('variant="header-crest"');
    const actions = readRelative("components/admin/layout/AdminPageActions.tsx");
    expect(actions).not.toContain("Saison wechseln");
    const utilities = readRelative("components/sce/navigation/SceGlobalUtilities.tsx");
    expect(utilities).toContain("SceGlobalSeasonSwitcher");
  });

  it("does not introduce binary checkbox controls in navigation package", () => {
    const navIndex = readRelative("components/sce/navigation/index.ts");
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(navIndex).not.toContain('type="checkbox"');
    expect(shell).not.toContain('type="checkbox"');
  });
});
