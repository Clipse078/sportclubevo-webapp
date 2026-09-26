/**
 * SCE-NAV-IA-V2-03R1 — single primary-active sibling per navigation level
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  isDomainHeaderSecondaryItemActive,
  isModuleLocalChildPrimaryActive,
  resolveActiveAppNavigation,
  resolvePrimaryActiveSecondaryItemKey,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function readRelative(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function countPrimaryActiveL1(model: ReturnType<typeof buildAppNavigationModelForUser>, pathname: string) {
  const active = resolveActiveAppNavigation(pathname, model);
  return model.domains.filter((domain) => active.activeDomainId === domain.id).length;
}

function countPrimaryActiveL2(
  pathname: string,
  active: ReturnType<typeof resolveActiveAppNavigation>,
) {
  if (!active.activeDomain) return 0;
  return active.domainSecondaryItems.filter((item) =>
    isDomainHeaderSecondaryItemActive(
      pathname,
      active.activeDomain!,
      item,
      active.activeDestinationKey,
      active.activeChildKey,
      active.domainSecondaryItems,
    ),
  ).length;
}

function countPrimaryActiveL3(
  pathname: string,
  active: ReturnType<typeof resolveActiveAppNavigation>,
) {
  return active.moduleLocalChildren.filter((child) =>
    isModuleLocalChildPrimaryActive(
      pathname,
      child,
      active.moduleLocalChildren,
      active.activeChildKey,
    ),
  ).length;
}

describe("SCE-NAV-IA-V2-03R1 single-active navigation", () => {
  it("shows German L1 label Publizieren while keeping technical key publishing", () => {
    const de = JSON.parse(readRelative("messages/de.json")) as {
      AppShell: { domains: { publishing: string } };
    };
    expect(de.AppShell.domains.publishing).toBe("Publizieren");

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing");
    expect(publishing?.id).toBe("publishing");
  });

  it("CASE 1: /dashboard/website/news — Publizieren → Inhalte → News only", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/website/news";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("publishing");
    expect(countPrimaryActiveL1(model, pathname)).toBe(1);

    const l2Active = active.domainSecondaryItems.filter((item) =>
      isDomainHeaderSecondaryItemActive(
        pathname,
        active.activeDomain!,
        item,
        active.activeDestinationKey,
        active.activeChildKey,
        active.domainSecondaryItems,
      ),
    );
    expect(l2Active.map((item) => item.label)).toEqual(["Inhalte"]);
    expect(countPrimaryActiveL2(pathname, active)).toBe(1);

    const l3Active = active.moduleLocalChildren.filter((child) =>
      isModuleLocalChildPrimaryActive(
        pathname,
        child,
        active.moduleLocalChildren,
        active.activeChildKey,
      ),
    );
    expect(l3Active.map((child) => child.label)).toEqual(["News"]);
    expect(countPrimaryActiveL3(pathname, active)).toBe(1);
    expect(active.activeChildKey).toBe("website-news");
  });

  it("CASE 2: /dashboard/infoboard/preview — Publizieren → Kanäle → Vorschau only", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/infoboard/preview";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("publishing");
    expect(countPrimaryActiveL1(model, pathname)).toBe(1);

    const l2Active = active.domainSecondaryItems.filter((item) =>
      isDomainHeaderSecondaryItemActive(
        pathname,
        active.activeDomain!,
        item,
        active.activeDestinationKey,
        active.activeChildKey,
        active.domainSecondaryItems,
      ),
    );
    expect(l2Active.map((item) => item.label)).toEqual(["Kanäle"]);
    expect(countPrimaryActiveL2(pathname, active)).toBe(1);

    const l3Active = active.moduleLocalChildren.filter((child) =>
      isModuleLocalChildPrimaryActive(
        pathname,
        child,
        active.moduleLocalChildren,
        active.activeChildKey,
      ),
    );
    expect(l3Active.map((child) => child.label)).toEqual(["Vorschau"]);
    expect(countPrimaryActiveL3(pathname, active)).toBe(1);
    expect(active.activeChildKey).toBe("infoboard-preview");
  });

  it("CASE 3: /dashboard/matchcenter — Planung → Spiele only at L1/L2", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    const pathname = "/dashboard/matchcenter";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("planning");
    expect(countPrimaryActiveL1(model, pathname)).toBe(1);
    expect(countPrimaryActiveL2(pathname, active)).toBe(1);

    const winnerKey = resolvePrimaryActiveSecondaryItemKey(
      pathname,
      active.activeDomain!,
      active.domainSecondaryItems,
      active.activeDestinationKey,
      active.activeChildKey,
    );
    const winner = active.domainSecondaryItems.find((item) => item.key === winnerKey);
    expect(winner?.label).toBe("Spiele");
  });

  it("CASE 4: deep Club route — Club L1 and exactly one L2 sibling active", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/org-units";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("club");
    expect(countPrimaryActiveL1(model, pathname)).toBe(1);
    expect(countPrimaryActiveL2(pathname, active)).toBe(1);

    const l2Active = active.domainSecondaryItems.filter((item) =>
      isDomainHeaderSecondaryItemActive(
        pathname,
        active.activeDomain!,
        item,
        active.activeDestinationKey,
        active.activeChildKey,
        active.domainSecondaryItems,
      ),
    );
    expect(l2Active.map((item) => item.label)).toEqual(["Organisation"]);
  });

  it("never marks more than one Row-2 sibling primary-active across representative routes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const paths = [
      "/dashboard/website/news",
      "/dashboard/infoboard/preview",
      "/dashboard/website",
      "/dashboard/planner/week",
      "/dashboard/matchcenter",
      "/dashboard/org-units",
      "/dashboard/sponsoring",
    ];

    for (const pathname of paths) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(countPrimaryActiveL1(model, pathname)).toBeLessThanOrEqual(1);
      expect(countPrimaryActiveL2(pathname, active)).toBeLessThanOrEqual(1);
      expect(countPrimaryActiveL3(pathname, active)).toBeLessThanOrEqual(1);
    }
  });

  it("preserves same-href alias resolution without duplicate L3 primary actives on CMS overview", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/website";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDestinationKey).toBe("website");
    expect(countPrimaryActiveL3(pathname, active)).toBe(1);
    const l3Active = active.moduleLocalChildren.filter((child) =>
      isModuleLocalChildPrimaryActive(
        pathname,
        child,
        active.moduleLocalChildren,
        active.activeChildKey,
      ),
    );
    expect(l3Active.map((child) => child.key)).toEqual(["website-overview"]);
  });
});
