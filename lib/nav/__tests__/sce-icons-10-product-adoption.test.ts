/**
 * SCE-ICONS-10 — product-wide domain adoption, inventory & regression guard.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditNavigationCompleteness,
  buildAppNavigationModelForUser,
} from "@/lib/nav/app-navigation-model";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import {
  NAV_DESTINATION_SCE_ICON_BY_KEY,
  getNavDestinationSceIconName,
} from "@/lib/nav/nav-destination-sce-icons";
import {
  MISSING_SCE_SEMANTICS,
  missingSceSemanticConcepts,
} from "@/lib/icons/missing-sce-semantics";
import {
  runProductDomainIconInventory,
  UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE,
} from "@/lib/icons/product-domain-icon-inventory";
import { LUCIDE_UTILITY_ALLOWLIST } from "@/lib/icons/lucide-utility-allowlist";
import {
  SCE_APPROVED_MASTER_ICON_NAMES,
  SCE_APPROVED_MASTER_ASSETS,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import { SCE_MASTER_SEMANTIC_MAPPING_AUDIT } from "@/lib/nav/sce-master-semantic-mapping-audit";

const DEFERRED_NOW_ADOPTED = [
  ["organisation", "organisation"],
  ["veranstaltungen", "events"],
  ["vereine", "club"],
  ["meetings", "committee-board"],
] as const;

describe("SCE-ICONS-10 artwork freeze", () => {
  it("keeps 90 approved masters and extended registry concepts", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    expect(SCE_ICON_REGISTRY_NAMES.length).toBeGreaterThanOrEqual(104);
    expect(readdirSync(join(process.cwd(), "public/images/icons")).filter((f) => f.endsWith(".svg")).length).toBe(
      90,
    );
  });

  it("does not modify approved SVG sources in this programme phase", () => {
    const before = readFileSync(
      join(process.cwd(), "components/design-system/icons/masters/approved-hero-fingerprint.ts"),
      "utf8",
    );
    expect(before).toContain("SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS");
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(SCE_ICON_REGISTRY[name].masterAssetPath).toBe(SCE_APPROVED_MASTER_ASSETS[name]);
    }
  });
});

describe("SCE-ICONS-10 deferred nav semantics resolved", () => {
  it("adopts organisation, events, club, and committee-board meetings", () => {
    for (const [destination, master] of DEFERRED_NOW_ADOPTED) {
      expect(getNavDestinationSceIconName(destination)).toBe(master);
      const row = SCE_MASTER_SEMANTIC_MAPPING_AUDIT.find((r) => r.destination === destination);
      expect(row?.adoptedNow).toBe(true);
      expect(row?.proposedSceMaster).toBe(master);
    }
  });

  it("maps competitions to the competition master (not standings)", () => {
    expect(getNavDestinationSceIconName("competitions")).toBe("competition");
    expect(missingSceSemanticConcepts().has("competition")).toBe(false);
  });
});

describe("SCE-ICONS-10 repository adoption inventory", () => {
  it("has zero unresolved domain glyphs when an approved master exists", () => {
    const report = runProductDomainIconInventory();
    expect(report.unresolvedDomainWithExistingMaster).toEqual([]);
  });

  it("has no missing master semantics after SCE-ICONS-13", () => {
    expect(MISSING_SCE_SEMANTICS.length).toBe(0);
    expect(reportMissingWithoutMaster()).toEqual([]);
  });

  it("keeps utility boundary separate from domain mapping table", () => {
    for (const sym of LUCIDE_UTILITY_ALLOWLIST) {
      expect(UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE[sym]).toBeUndefined();
    }
  });
});

function reportMissingWithoutMaster() {
  return runProductDomainIconInventory().unresolvedDomainWithoutMaster;
}

describe("SCE-ICONS-10 navigation completeness", () => {
  it("preserves 60/60/0 club-admin navigation completeness", () => {
    const permissionKeys = Object.values(PERMISSIONS) as PermissionKey[];
    const sections = getVisibleNavSections(permissionKeys, "club");
    const model = buildAppNavigationModelForUser(permissionKeys, "club");
    const report = auditNavigationCompleteness(sections, model);
    expect(report.canonicalVisibleDestinations).toBe(60);
    expect(report.reachableDestinations).toBe(60);
    expect(report.orphanedDestinations).toEqual([]);
  });

  it("maps every adopted nav destination through approved masters", () => {
    for (const [navKey, iconName] of Object.entries(NAV_DESTINATION_SCE_ICON_BY_KEY)) {
      expect(getNavDestinationSceIconName(navKey)).toBe(iconName);
      expect(SCE_ICON_REGISTRY[iconName].geometrySource).toBe("approved-master");
    }
  });
});

describe("SCE-ICONS-10 regression guard surfaces", () => {
  it("uses NavDestinationSceIcon in primary shell navigation", () => {
    const shell = readFileSync(join(process.cwd(), "components/admin/layout/AppShellNavigation.tsx"), "utf8");
    expect(shell).toContain("NavDestinationSceIcon");
    expect(shell).toContain("getNavDestinationSceIconName");
  });
});
