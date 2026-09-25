/**
 * SCE-VISUAL-03R1 — domain hierarchy + responsive navigation corrections
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_DOMAIN_MAP_SUMMARY,
  CLUB_NAV_ITEM_TO_DOMAIN,
} from "@/lib/nav/app-navigation-domains";
import {
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
  resolvePrimaryDomainPresentation,
  selectMobileBottomDomains,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

describe("SCE-VISUAL-03R1 navigation hierarchy", () => {
  it("does not expose every former sidebar item as a primary domain", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    expect(model.domains.length).toBeLessThanOrEqual(7);
    expect(model.domains.length).toBeGreaterThanOrEqual(4);
    const domainIds = model.domains.map((d) => d.id);
    expect(domainIds).not.toContain("mitglieder");
    expect(domainIds).not.toContain("anmeldungen");
    expect(domainIds).not.toContain("website");
  });

  it("groups Planung destinations under the planning domain", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const planning = model.domains.find((d) => d.id === "planning");
    expect(planning?.destinations.map((d) => d.key)).toEqual(["planung"]);
    const planung = planning?.destinations[0];
    expect(planung?.children?.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        "Wochenplaner",
        "Trainings",
        "Spiele",
        "Turniere",
        "Veranstaltungen",
      ]),
    );
  });

  it("keeps Organisation members/registrations as domain destinations, not primary peers", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const org = model.domains.find((d) => d.id === "organisation");
    expect(org?.destinations.map((d) => d.key)).toEqual(
      expect.arrayContaining(["organisation", "mitglieder", "anmeldungen"]),
    );
    expect(model.domains.map((d) => d.id)).not.toContain("mitglieder");
  });

  it("drops destinations with no permission from the filtered model", () => {
    const model = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    expect(model.destinations.some((d) => d.key === "website")).toBe(false);
    expect(model.domains.some((d) => d.id === "communication")).toBe(true);
  });

  it("still resolves routes through permission-filtered destinations", () => {
    const limited = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    const destKeys = limited.destinations.map((d) => d.key);
    expect(destKeys).toContain("aufgaben");
    expect(destKeys).not.toContain("website");
  });

  it("promotes the active domain when overflow would hide it", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const active = resolveActiveAppNavigation("/dashboard/sponsoring", model);
    expect(active.activeDomainId).toBe("club");
    const presentation = resolvePrimaryDomainPresentation(model.domains, active.activeDomainId, 4);
    expect(presentation.inlineDomains.some((d) => d.id === "club")).toBe(true);
  });

  it("does not render mobile bottom navigation on desktop/laptop breakpoints in CSS", () => {
    const navCss = readRelative("app/(admin)/global-app-navigation.css");
    expect(navCss).toContain("data-sce-mobile-bottom-nav");
    expect(navCss).toContain("display: none");
    expect(navCss).toContain("@media (max-width: 767px)");
    expect(navCss).toContain("display: flex");
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).not.toContain('"md:hidden"');
    expect(shellNav).toContain("selectMobileBottomDomains");
  });

  it("derives mobile bottom navigation from domains", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const bottom = selectMobileBottomDomains(model, "planning", 3);
    expect(bottom.every((d) => model.domains.some((x) => x.id === d.id))).toBe(true);
    expect(bottom.length).toBeLessThanOrEqual(3);
  });

  it("preserves SCE and tenant identity hooks in the shell header", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain("SidebarPlatformBrand");
    expect(shellNav).toContain("HeaderTenantIdentity");
    expect(shellNav).toContain("sce-global-header-utilities");
  });

  it("suppresses redundant Planung breadcrumbs on simple module pages by default", () => {
    const header = readRelative("components/admin/planning/PlanningManagementPageHeader.tsx");
    expect(header).toContain("showDomainBreadcrumb = false");
  });

  it("uses AppShell i18n keys for Mehr and drawer chrome", () => {
    const shellNav = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shellNav).toContain('useTranslations("AppShell")');
    expect(shellNav).toContain('t("more")');
    for (const locale of ["de", "en", "fr", "it"] as const) {
      const messages = JSON.parse(readRelative(`messages/${locale}.json`)) as {
        AppShell: { more: string; openDrawer: string };
      };
      expect(messages.AppShell.more).toBeTruthy();
      expect(messages.AppShell.openDrawer).toBeTruthy();
    }
  });

  it("documents the club domain map", () => {
    expect(CLUB_DOMAIN_MAP_SUMMARY.planning).toEqual(["planung"]);
    expect(CLUB_NAV_ITEM_TO_DOMAIN.mitglieder).toBe("organisation");
    expect(CLUB_NAV_ITEM_TO_DOMAIN.website).toBe("club");
  });

  it("resolves planning contextual children for deep routes", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const active = resolveActiveAppNavigation("/dashboard/planner/week", model);
    expect(active.activeDomainId).toBe("planning");
    expect(active.activeChildKey).toBe("wochenplanner");
    expect(active.contextualChildren.map((c) => c.key)).toContain("wochenplanner");
  });

  it("still derives planning children from canonical nav-config", () => {
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
});
