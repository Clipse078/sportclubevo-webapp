/**
 * SCE-VISUAL-03 — responsive global navigation architecture
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  getPrimaryNavPriority,
  buildNavigationHref,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { SCE_AUTHENTICATED_APP_BACKGROUND_PATH } from "@/lib/shell/sce-app-background";
import {
  SCE_APP_SHELL_GLOBAL_NAV_CLASS,
  SCE_GLOBAL_APP_HEADER_CLASS,
} from "@/lib/shell/sce-app-shell-nav";
import {
  SCE_SURFACE_TOKEN_DENSE,
  SCE_SURFACE_TOKEN_STANDARD,
} from "@/lib/shell/sce-surface-system";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-VISUAL-03 global app navigation", () => {
  it("uses one canonical navigation model for shell presentations", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    expect(model.domains.length).toBeGreaterThan(3);
    expect(model.destinations.length).toBeGreaterThan(5);

    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("buildAppNavigationModelForUser");
    expect(shellNav).toContain("resolveActiveAppNavigation");
    expect(shellNav).not.toContain("FC Allschwil");
  });

  it("does not hard-code tenant identity or reference tenant names", () => {
    const headerTenant = readRelative("components/admin/layout/HeaderTenantIdentity.tsx");
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    for (const src of [headerTenant, shellNav]) {
      expect(src).not.toContain("FC Allschwil");
      expect(src).not.toContain("FCA");
    }
    expect(headerTenant).toContain("tenantName");
    expect(shellNav).toContain("clubName");
  });

  it("preserves SCE product logo component and tenant crest source", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("SidebarPlatformBrand");
    expect(shellNav).toContain("HeaderTenantIdentity");
    expect(shellNav).toContain("logoUrl");
  });

  it("preserves permission filtering via getVisibleNavSections", () => {
    const limited = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    const keys = limited.destinations.map((i) => i.key);
    expect(keys).toContain("aufgaben");
    expect(keys).not.toContain("website");
  });

  it("resolves Planning contextual destinations and deep routes", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const routes: Array<[string, string, string | null]> = [
      ["/dashboard/planner/week", "planung", "wochenplanner"],
      ["/dashboard/training", "planung", "trainingcenter"],
      ["/dashboard/training/series/abc/edit", "planung", "trainingcenter"],
      ["/dashboard/matchcenter", "planung", "matchcenter"],
      ["/dashboard/tournamentcenter", "planung", "tournamentcenter"],
      ["/dashboard/veranstaltungen", "planung", "veranstaltungen"],
    ];
    for (const [pathname, primaryKey, childKey] of routes) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDestinationKey, pathname).toBe(primaryKey);
      expect(active.activeChildKey, pathname).toBe(childKey);
    }
  });

  it("maps representative cross-module routes to parent domains", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const samples: Array<[string, string, string]> = [
      ["/dashboard", "dashboard", "dashboard"],
      ["/dashboard/mitglieder", "club", "mitglieder"],
      ["/dashboard/registrations", "club", "anmeldungen"],
      ["/dashboard/aufgaben", "communication", "aufgaben"],
      ["/dashboard/workspace", "communication", "workspace"],
      ["/dashboard/website/pages", "publishing", "website"],
      ["/dashboard/infoboard/preview", "publishing", "infoboard"],
      ["/dashboard/trainer-staff", "club", "trainer-staff"],
      ["/vereinsleitung/meetings", "club", "meetings"],
      ["/vereinsleitung/finanzen", "club", "finanzen"],
      ["/dashboard/sponsoring", "club", "sponsoring"],
    ];
    for (const [pathname, domainId, destinationKey] of samples) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe(domainId);
      expect(active.activeDestinationKey, pathname).toBe(destinationKey);
    }
  });

  it("removes permanent desktop sidebar from authenticated layout", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain("AppShellNavigation");
    expect(layout).not.toMatch(/<AdminSidebar[\s/>]/);
    expect(layout).toContain("SCE_APP_SHELL_GLOBAL_NAV_CLASS");
  });

  it("defines overflow priority metadata and mobile bottom navigation", () => {
    expect(getPrimaryNavPriority("planung")).toBe(1);
    expect(getPrimaryNavPriority("finanzen")).toBe(3);
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("sce-global-primary-nav-overflow");
    expect(shellNav).toContain("data-nav-domain-priority");
    const navCss = readRelative("app/(admin)/global-app-navigation.css");
    expect(navCss).toContain("sce-mobile-bottom-nav");
    expect(navCss).toContain("data-sce-mobile-bottom-nav");
  });

  it("exposes aria-current on active navigation states", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain('aria-current={isActive ? "page" : undefined}');
    expect(shellNav).toContain('aria-current={isChildActive ? "page" : undefined}');
  });

  it("excludes public, infoboard display, and auth surfaces from shell nav scope", () => {
    const layout = readRelative("app/(admin)/layout.tsx");
    expect(layout).toContain('redirect("/login")');
    const publicLayout = readRelative("app/layout.tsx");
    expect(publicLayout).not.toContain("AppShellNavigation");
    const infoboardLayout = readRelative("app/infoboard/layout.tsx");
    expect(infoboardLayout).not.toContain("AppShellNavigation");
  });

  it("preserves SCE background path and SCE-VISUAL-02 surface tokens", () => {
    expect(SCE_AUTHENTICATED_APP_BACKGROUND_PATH).toBe(
      "/images/background/SCE_background.png",
    );
    const shellCss = readRelative("app/(admin)/authenticated-shell.css");
    expect(shellCss).not.toMatch(/SCE_background\.png/);
    const globals = readRelative("app/globals.css");
    expect(globals).toContain(`${SCE_SURFACE_TOKEN_STANDARD}:`);
    expect(globals).toContain(`${SCE_SURFACE_TOKEN_DENSE}:`);
  });

  it("uses semantic nav landmarks in the global header", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain(SCE_GLOBAL_APP_HEADER_CLASS);
    expect(shellNav).toContain('useTranslations("AppShell")');
    expect(shellNav).toContain('t("primaryNavAria")');
    expect(shellNav).toContain('t("contextNavAria")');
  });

  it("derives Planning children from canonical nav-config", () => {
    const sections = getVisibleNavSections(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const planung = sections.flatMap((s) => s.items).find((i) => i.key === "planung");
    expect(planung?.children?.map((c) => c.href)).toEqual(
      expect.arrayContaining([
        "/dashboard/planner/week",
        "/dashboard/training",
        "/dashboard/matchcenter",
        "/dashboard/tournamentcenter",
        "/dashboard/veranstaltungen",
      ]),
    );
  });

  it("carries season query on canonical season-aware dashboard hrefs", () => {
    expect(buildNavigationHref("/dashboard/teams", "2025")).toContain("season=2025");
    expect(buildNavigationHref("/dashboard", "2025")).toContain("season=2025");
    expect(buildNavigationHref("/vereinsleitung/finanzen", "2025")).toBe(
      "/vereinsleitung/finanzen",
    );
  });
});
