/**
 * SCE-NAV-IA-V2-02 — canonical taxonomy & navigation model regression tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLUB_DOMAIN_MAP_SUMMARY,
  CLUB_L1_DOMAIN_ORDER,
  CLUB_NAV_ITEM_TO_DOMAIN,
} from "@/lib/nav/app-navigation-domains";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
  resolveActiveAppNavigation,
} from "@/lib/nav/app-navigation-model";
import { buildExplorerSearchIndex } from "@/lib/nav/app-navigation-explorer";
import {
  buildCurrentInventoryForPermissions,
  buildTargetMatrixFromInventory,
  computeCompletenessBaseline,
} from "@/lib/nav/nav-ia-v2/build-current-inventory";
import { auditRuntimeModelAgainstTargetMatrix } from "@/lib/nav/nav-ia-v2/audit-runtime-model";
import {
  CLUB_L1_DEFAULT_DESTINATION_KEYS,
  LEGACY_CLUB_NAV_ITEM_TO_DOMAIN,
  TARGET_L1_SCE_ICONS,
  wasLegacyOrganisationNavDestination,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function loadApprovedTargetMatrix() {
  const raw = readFileSync(
    join(process.cwd(), "docs/navigation/SCE-NAV-IA-V2-01-target-ia-matrix.json"),
    "utf8",
  );
  return JSON.parse(raw) as { destinations: ReturnType<typeof buildTargetMatrixFromInventory> };
}

describe("SCE-NAV-IA-V2-02 taxonomy model", () => {
  it("exposes exactly five club L1 domains in canonical order", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const clubDomains = model.domains.filter((d) => CLUB_L1_DOMAIN_ORDER.includes(d.id as never));
    expect(clubDomains.map((d) => d.id)).toEqual([...CLUB_L1_DOMAIN_ORDER]);
    expect(model.domains.some((d) => d.id === "organisation")).toBe(false);
  });

  it("maps all legacy Organisation destinations under Club", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const legacyOrg = inventory.filter((row) => wasLegacyOrganisationNavDestination(row));
    expect(legacyOrg.length).toBe(15);
    const matrix = buildTargetMatrixFromInventory(inventory);
    for (const row of legacyOrg) {
      const target = matrix.find((entry) => entry.key === row.key);
      expect(target?.targetL1).toBe("club");
    }
    expect(CLUB_NAV_ITEM_TO_DOMAIN.organisation).toBe("club");
    expect(CLUB_NAV_ITEM_TO_DOMAIN.mitglieder).toBe("club");
    expect(LEGACY_CLUB_NAV_ITEM_TO_DOMAIN.mitglieder).toBe("organisation");
  });

  it("maps all Publishing destinations under Publishing L1", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const publishingKeys = inventory
      .filter((row) => row.key.startsWith("website") || row.key.startsWith("infoboard"))
      .map((row) => row.key);
    expect(publishingKeys.length).toBe(15);
    const matrix = buildTargetMatrixFromInventory(inventory);
    for (const key of publishingKeys) {
      const target = matrix.find((row) => row.key === key);
      expect(target?.targetL1).toBe("publishing");
    }
    expect(CLUB_NAV_ITEM_TO_DOMAIN.website).toBe("publishing");
    expect(CLUB_NAV_ITEM_TO_DOMAIN.infoboard).toBe("publishing");
  });

  it("matches the approved 60-destination target matrix with zero mismatches", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const matrix = buildTargetMatrixFromInventory(inventory);
    expect(matrix).toHaveLength(60);

    const approved = loadApprovedTargetMatrix().destinations;
    expect(approved).toHaveLength(60);

    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const audit = auditRuntimeModelAgainstTargetMatrix(sections, model, matrix);
    expect(audit.unmapped).toEqual([]);
    expect(audit.mismatches).toEqual([]);
    expect(audit.duplicateCanonicalNodes).toEqual([]);
    expect(audit.mapped).toBe(60);
  });

  it("resolves deep routes against the V2 taxonomy without pathname hacks", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const samples: Array<[string, string, string]> = [
      ["/dashboard/org-units", "club", "organisation"],
      ["/dashboard/teams/abc", "club", "organisation"],
      ["/dashboard/mitglieder", "club", "mitglieder"],
      ["/dashboard/website", "publishing", "website"],
      ["/dashboard/website/pages/abc", "publishing", "website"],
      ["/dashboard/infoboard/preview", "publishing", "infoboard"],
    ];
    for (const [pathname, domainId, destinationKey] of samples) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe(domainId);
      expect(active.activeDestinationKey, pathname).toBe(destinationKey);
    }
  });

  it("uses deterministic default destinations from existing routes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const domainToTargetL1 = {
      dashboard: "dashboard",
      planning: "planung",
      communication: "kommunikation",
      club: "club",
      publishing: "publishing",
    } as const;
    for (const domainId of CLUB_L1_DOMAIN_ORDER) {
      const domain = model.domains.find((d) => d.id === domainId);
      expect(domain?.defaultDestination.key).toBe(
        CLUB_L1_DEFAULT_DESTINATION_KEYS[domainToTargetL1[domainId]],
      );
    }
  });

  it("preserves permission filtering and does not broaden access", () => {
    const limited = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    expect(limited.domains.some((d) => d.id === "publishing")).toBe(false);
    expect(limited.destinations.some((d) => d.key === "website")).toBe(false);
    expect(limited.domains.some((d) => d.id === "communication")).toBe(true);

    const orgOnly = buildAppNavigationModelForUser(
      [PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_MANAGE],
      "club",
    );
    expect(orgOnly.domains.some((d) => d.id === "publishing")).toBe(false);
    expect(orgOnly.destinations.some((d) => d.key === "website")).toBe(false);
    expect(orgOnly.domains.some((d) => d.id === "club")).toBe(true);
  });

  it("indexes App Explorer with V2 L1 domains", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const hits = buildExplorerSearchIndex(model, (domain) => domain.fallbackLabel);
    const domainHits = hits.filter((hit) => hit.kind === "domain");
    expect(domainHits.map((hit) => hit.domainId)).toEqual(
      expect.arrayContaining([...CLUB_L1_DOMAIN_ORDER]),
    );
    expect(domainHits.some((hit) => hit.domainId === "organisation")).toBe(false);
  });

  it("preserves navigation destination keys for Quick Access compatibility", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const keys = inventory.map((row) => row.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("documents same-href aliases without duplicate canonical secondary nodes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing");
    const website = publishing?.destinations.find((d) => d.key === "website");
    const overviewChild = website?.children?.find((c) => c.key === "website-overview");
    expect(website?.href).toBe(overviewChild?.href);
    const audit = auditRuntimeModelAgainstTargetMatrix(
      getVisibleNavSections(CLUB_ADMIN_KEYS, "club"),
      model,
      buildTargetMatrixFromInventory(buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club")),
    );
    expect(audit.duplicateCanonicalNodes).toEqual([]);
  });

  it("maintains club-admin navigation completeness at 60/60/0", () => {
    const baseline = computeCompletenessBaseline(CLUB_ADMIN_KEYS, "club");
    expect(baseline.visibleDestinations).toBe(60);
    expect(baseline.reachableDestinations).toBe(60);
    expect(baseline.orphanedDestinations).toEqual([]);
    expect(baseline.unregisteredAuthenticatedRoutes).toEqual([]);

    const sections = getVisibleNavSections(CLUB_ADMIN_KEYS, "club");
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.orphanedDestinations).toEqual([]);
  });

  it("uses publish SCE master for Publishing L1 icon metadata", () => {
    expect(TARGET_L1_SCE_ICONS.publishing).toBe("publish");
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const publishing = model.domains.find((d) => d.id === "publishing");
    expect(publishing?.l1SceIconKey).toBe("publish");
  });

  it("documents club domain map summary for Organisation under Club", () => {
    expect(CLUB_DOMAIN_MAP_SUMMARY.club).toEqual(
      expect.arrayContaining(["organisation", "mitglieder", "anmeldungen", "trainer-staff"]),
    );
    expect(CLUB_DOMAIN_MAP_SUMMARY.publishing).toEqual(["website", "infoboard"]);
  });
});
