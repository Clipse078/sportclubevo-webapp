/**
 * SCE-NAV-IA-V2-04 — App Explorer, responsive discovery, search + active context
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_L1_DOMAIN_ORDER,
  NAVIGATION_DOMAIN_DEFINITIONS,
} from "@/lib/nav/app-navigation-domains";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
  buildSemanticNavigationDestinationCatalog,
  flattenVisibleCanonicalNavLeaves,
  isSingleHubNavigationDomain,
  resolveActiveAppNavigation,
  resolveDomainExplorerModuleItems,
  resolveDomainSecondaryNavItems,
  resolveExplorerDomainGroups,
} from "@/lib/nav/app-navigation-model";
import {
  buildExplorerSearchIndex,
  countDuplicateCanonicalExplorerSearchHits,
  dedupeExplorerSearchHits,
  filterExplorerSearchIndex,
  formatExplorerSearchHitContext,
  resolveExplorerGroupsForDomain,
} from "@/lib/nav/app-navigation-explorer";
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

describe("SCE-NAV-IA-V2-04 App Explorer", () => {
  const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
  const domainLabel = (domain: { fallbackLabel: string }) => domain.fallbackLabel;

  it("exposes canonical five club domains with Publizieren label and publishing id", () => {
    const clubL1 = model.domains
      .filter((d) => CLUB_L1_DOMAIN_ORDER.includes(d.id as (typeof CLUB_L1_DOMAIN_ORDER)[number]))
      .map((d) => d.id);
    expect(clubL1).toEqual([...CLUB_L1_DOMAIN_ORDER]);
    expect(model.domains.some((d) => d.id === "organisation")).toBe(false);
    expect(NAVIGATION_DOMAIN_DEFINITIONS.publishing.fallbackLabel).toBe("Publizieren");
    expect(model.domains.find((d) => d.id === "publishing")?.fallbackLabel).toBe("Publizieren");
  });

  it("groups Club explorer destinations into seven canonical L2 groups including Administration", () => {
    const club = model.domains.find((d) => d.id === "club")!;
    const groups = resolveExplorerDomainGroups(club)!;
    expect(groups.map((group) => group.label)).toEqual([
      "Organisation",
      "People & Teams",
      "Mitgliedschaft",
      "Vereinsentwicklung",
      "Club-Betrieb",
      "Finanzen & Partnerschaften",
      "Administration",
    ]);
    const adminGroup = groups.find((group) => group.id === "administration");
    expect(adminGroup?.modules.some((module) => module.key === "administration")).toBe(true);

    const headerSecondary = resolveDomainSecondaryNavItems(club);
    expect(headerSecondary.some((item) => item.label === "Administration")).toBe(false);
  });

  it("groups Publishing explorer destinations with Infoboard under Kanäle", () => {
    const publishing = model.domains.find((d) => d.id === "publishing")!;
    const groups = resolveExplorerGroupsForDomain(publishing)!;
    expect(groups.map((group) => group.label)).toEqual(
      expect.arrayContaining(["Übersicht", "Inhalte", "Kanäle", "Einstellungen"]),
    );
    const kanaele = groups.find((group) => group.id === "kanaele");
    expect(kanaele?.modules.some((module) => module.key === "infoboard")).toBe(true);

    const index = buildExplorerSearchIndex(model, domainLabel);
    const infoboardHit = index.find((hit) => hit.key === "infoboard");
    expect(infoboardHit?.groupLabel).toBe("Kanäle");
  });

  it("keeps all 60 club-admin destinations discoverable in explorer modules/search", () => {
    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const leaves = flattenVisibleCanonicalNavLeaves(sections);
    const explorerKeys = new Set<string>();
    for (const domain of model.domains) {
      for (const moduleEntry of resolveDomainExplorerModuleItems(domain)) {
        explorerKeys.add(moduleEntry.key);
        const destination = domain.destinations.find((dest) => dest.key === moduleEntry.key);
        for (const child of destination?.children ?? []) {
          explorerKeys.add(child.key);
        }
      }
    }
    const searchKeys = new Set(
      buildExplorerSearchIndex(model, domainLabel)
        .filter((hit) => hit.kind !== "domain")
        .map((hit) => hit.key),
    );
    for (const leaf of leaves) {
      const domain = model.domains.find((entry) =>
        entry.destinations.some((dest) => dest.key === (leaf.parentKey ?? leaf.key)),
      );
      const hubOnlyShell =
        domain &&
        isSingleHubNavigationDomain(domain) &&
        leaf.parentKey === null &&
        leaf.key === domain.destinations[0]?.key;
      if (hubOnlyShell) continue;

      expect(explorerKeys.has(leaf.key), `explorer module tree missing ${leaf.key}`).toBe(true);
      expect(searchKeys.has(leaf.key), `search index missing ${leaf.key}`).toBe(true);
    }
    expect(leaves.length).toBe(60);
  });

  it("does not hide headerVisible=false destinations from explorer", () => {
    const club = model.domains.find((d) => d.id === "club")!;
    const explorerModules = resolveDomainExplorerModuleItems(club);
    expect(explorerModules.some((module) => module.key === "administration")).toBe(true);
  });

  it("deduplicates canonical explorer search hits for same-href aliases", () => {
    const index = buildExplorerSearchIndex(model, domainLabel);
    const websiteHits = index.filter(
      (hit) => hit.href === "/dashboard/website" && hit.kind !== "domain",
    );
    expect(websiteHits.length).toBeGreaterThan(1);
    expect(countDuplicateCanonicalExplorerSearchHits(dedupeExplorerSearchHits(index))).toBe(0);

    const filtered = filterExplorerSearchIndex(index, "übersicht");
    const hrefs = filtered.map((hit) => hit.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(countDuplicateCanonicalExplorerSearchHits(filtered)).toBe(0);
  });

  it("filters search by domain and group context with permissions", () => {
    const limited = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    const index = buildExplorerSearchIndex(limited, domainLabel);
    const hits = filterExplorerSearchIndex(index, "website");
    expect(hits).toEqual([]);

    const teamsHit = filterExplorerSearchIndex(
      buildExplorerSearchIndex(model, domainLabel),
      "teams",
    ).find((hit) => hit.key === "teams");
    expect(teamsHit).toBeTruthy();
    expect(formatExplorerSearchHitContext(teamsHit!)).toContain("Club");
  });

  it("opens explorer active context from canonical routes", () => {
    const samples: Array<[string, string]> = [
      ["/dashboard/website/news", "publishing"],
      ["/dashboard/infoboard/preview", "publishing"],
      ["/dashboard/matchcenter", "planning"],
      ["/dashboard/org-units", "club"],
    ];
    for (const [pathname, domainId] of samples) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe(domainId);
    }
  });

  it("exposes semantic destination metadata without desktop JSX coupling", () => {
    const catalog = buildSemanticNavigationDestinationCatalog(model, domainLabel);
    expect(catalog.length).toBeGreaterThan(60);
    expect(catalog.every((row) => row.domainId && row.destinationKey && row.href)).toBe(true);
    expect(catalog.some((row) => row.groupLabel === "Administration")).toBe(true);
    const drawer = readRelative("components/admin/layout/GlobalNavDrawer.tsx");
    expect(drawer).not.toContain("NAV_SECTIONS");
  });

  it("preserves responsive explorer entry points without authorization bypass", () => {
    const shell = readRelative("components/admin/layout/AppShellNavigation.tsx");
    expect(shell).toContain("GlobalNavDrawer");
    expect(shell).toContain('data-testid="global-nav-hamburger"');
    expect(shell).toContain("SCE_MOBILE_BOTTOM_NAV_CLASS");

    const planningOnly = buildAppNavigationModelForUser(
      [PERMISSIONS.TRAININGS_VIEW, PERMISSIONS.EVENTS_VIEW],
      "club",
    );
    expect(planningOnly.domains.some((d) => d.id === "publishing")).toBe(false);
  });

  it("maintains V2 completeness and matrix regression gates", () => {
    const baseline = computeCompletenessBaseline(CLUB_ADMIN_KEYS, "club");
    expect(baseline.visibleDestinations).toBe(60);
    expect(baseline.reachableDestinations).toBe(60);
    expect(baseline.orphanedDestinations).toEqual([]);

    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.orphanedDestinations).toEqual([]);

    const audit = auditRuntimeModelAgainstTargetMatrix(
      sections,
      model,
      buildTargetMatrixFromInventory(buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club")),
    );
    expect(audit.mismatches).toEqual([]);
    expect(audit.unmapped).toEqual([]);
  });
});
