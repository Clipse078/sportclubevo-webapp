/**
 * SCE-ACTIVITY-CREATE-01J-R5.3.1 — Canonical navigation selected state (L1 + L2 + L3)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  isDomainHeaderSecondaryItemActive,
  isModuleLocalChildPrimaryActive,
  resolveActiveAppNavigation,
  resolveDomainSecondaryNavItems,
  resolvePrimaryActiveSecondaryItemKey,
} from "@/lib/nav/app-navigation-model";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const repoRoot = process.cwd();

function readRelative(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

function countPrimaryActiveL2(
  pathname: string,
  active: ReturnType<typeof resolveActiveAppNavigation>,
): number {
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

describe("SCE-ACTIVITY-CREATE-01J-R5.3.1 — canonical selected-state CSS contract", () => {
  it("active L1, L2, and L3 use var(--sce-primary) for label text", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-global-primary-nav-item--active\s*\{[\s\S]*color:\s*var\(--sce-primary\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link--active[\s\S]*color:\s*var\(--sce-primary\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-control--active[\s\S]*color:\s*var\(--sce-primary\)/,
    );
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l3-link--active[\s\S]*color:\s*var\(--sce-primary\)/,
    );
  });

  it("active L2 icons in the domain panel inherit canonical SCE primary", () => {
    const css = readRelative("app/(admin)/global-app-navigation.css");
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-control--active[\s\S]*\[data-sce-nav-destination-icon\][\s\S]*color:\s*var\(--sce-primary\)/,
    );
  });

  it("panel L2 browse selection without route active does not reuse --active modifier", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).toContain('active && "sce-domain-nav-panel-l2-control--active"');
    expect(panel).not.toMatch(/\(active \|\| selected\) && "sce-domain-nav-panel-l2-control--active"/);
    expect(panel).toContain('active={active}');
    expect(panel).not.toContain("active={active || selected}");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3.1 — hierarchical active path (Club → Organisation → Teams)", () => {
  it("deep Club teams route marks Club L1, Organisation L2, and Teams L3", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const pathname = "/dashboard/teams/abc123";
    const active = resolveActiveAppNavigation(pathname, model);

    expect(active.activeDomainId).toBe("club");
    expect(active.activeDestinationKey).toBe("organisation");

    const clubItems = resolveDomainSecondaryNavItems(
      model.domains.find((d) => d.id === "club")!,
    );
    const organisation = clubItems.find((item) => item.label === "Organisation");
    expect(organisation).toBeTruthy();

    const winnerKey = resolvePrimaryActiveSecondaryItemKey(
      pathname,
      active.activeDomain!,
      clubItems,
      active.activeDestinationKey,
      active.activeChildKey,
    );
    expect(winnerKey).toBe(organisation?.key);
    expect(countPrimaryActiveL2(pathname, active)).toBe(1);

    const teamsChild = active.moduleLocalChildren.find((child) => child.key === "teams");
    expect(teamsChild).toBeTruthy();
    expect(
      isModuleLocalChildPrimaryActive(
        pathname,
        teamsChild!,
        active.moduleLocalChildren,
        active.activeChildKey,
      ),
    ).toBe(true);
  });

  it("does not hardcode Organisation in panel implementation", () => {
    const panel = readRelative("components/sce/navigation/SceDomainNavigationPanel.tsx");
    expect(panel).not.toContain("Organisation");
  });
});

describe("SCE-ACTIVITY-CREATE-01J-R5.3.1 — SceNavigationItem aria-current for L1", () => {
  it("uses aria-current=page on active links", () => {
    const item = readRelative("components/sce/navigation/SceNavigationItem.tsx");
    expect(item).toContain('aria-current={isActive ? "page" : undefined}');
  });
});
