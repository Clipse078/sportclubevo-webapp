/**
 * SCE-ICONS-11 — complete authenticated webapp route & visual icon audit infrastructure.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "@/components/design-system/icons/registry";
import { LUCIDE_UTILITY_ALLOWLIST } from "@/lib/icons/lucide-utility-allowlist";
import { MISSING_SCE_SEMANTICS } from "@/lib/icons/missing-sce-semantics";
import {
  importLevelAmbiguityCount,
  runWebappIconCoverageAudit,
  semanticAmbiguityRemaining,
} from "@/lib/icons/webapp-icon-coverage-audit";
import { runProductDomainIconInventory } from "@/lib/icons/product-domain-icon-inventory";
import { resolveLucideSemantic } from "@/lib/icons/icon-semantic-resolution";

describe("SCE-ICONS-11 artwork freeze", () => {
  it("keeps 90 approved masters and registry asset paths aligned", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    expect(SCE_ICON_REGISTRY_NAMES.length).toBeGreaterThanOrEqual(104);
    expect(readdirSync(join(process.cwd(), "public/images/icons")).filter((f) => f.endsWith(".svg")).length).toBe(
      90,
    );
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(SCE_ICON_REGISTRY[name].masterAssetPath).toBe(SCE_APPROVED_MASTER_ASSETS[name]);
    }
  });

  it("preserves approved SVG fingerprint baseline file", () => {
    const fp = readFileSync(
      join(process.cwd(), "components/design-system/icons/masters/approved-hero-fingerprint.ts"),
      "utf8",
    );
    expect(fp).toContain("SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS");
  });
});

describe("SCE-ICONS-11 route coverage audit", () => {
  it(
    "discovers the authenticated admin route tree deterministically",
    () => {
      const report = runWebappIconCoverageAudit();
      expect(report.routeInventory.authenticatedRouteFiles).toBeGreaterThanOrEqual(190);
      expect(report.routeInventory.modulesAudited).toBe(report.routeInventory.authenticatedRouteFiles + 1);
      expect(report.routeInventory.canonicalNavDestinations).toBe(60);
      expect(report.navCompleteness.reachableDestinations).toBe(60);
      expect(report.navCompleteness.orphanedDestinations).toEqual([]);
      const snapshot = report.routeMatrix.map((r) => r.route).join("\n");
      expect(snapshot).toMatch(/\/dashboard\/veranstaltungen/);
      expect(report.routeMatrix.map((r) => r.route).join("\n")).toBe(snapshot);
    },
    60_000,
  );

  it("audits veranstaltungen as explicit mixed-surface testcase", () => {
    const { veranstaltungenDeepDive: dive } = runWebappIconCoverageAudit();
    expect(dive.route).toBe("/dashboard/veranstaltungen");
    expect(dive.KPI_LOCATIONS.symbols).toContain("FacilitySceIcon");
    expect(dive.CREATE_ACTION.symbols).toContain("Plus");
    expect(dive.whyVisuallyMixed.length).toBeGreaterThan(20);
  });

  it("materially resolves SCE-ICONS-10 import-level ambiguity", () => {
    expect(importLevelAmbiguityCount()).toBe(382);
    const remaining = semanticAmbiguityRemaining();
    expect(remaining).toBeLessThan(50);
  });

  it("keeps import-level unresolved-with-existing-master at zero", () => {
    const inventory = runProductDomainIconInventory();
    expect(inventory.unresolvedDomainWithExistingMaster).toEqual([]);
    const report = runWebappIconCoverageAudit();
    expect(report.masterAdoption.unresolvedDomainWithExistingMaster).toEqual([]);
    expect(report.masterAdoption.legacyLucideDespiteApprovedMaster).toEqual([]);
  });

  it("has zero missing-master backlog after SCE-ICONS-13", () => {
    const report = runWebappIconCoverageAudit();
    expect(report.missingMasterBacklog).toEqual([]);
    expect(MISSING_SCE_SEMANTICS).toEqual([]);
    expect(report.classificationTotals.SCE_DOMAIN_MISSING_MASTER).toBe(0);
  });

  it("does not expand the utility allowlist silently", () => {
    const report = runWebappIconCoverageAudit();
    expect(report.utilityBoundary.added).toEqual([]);
    expect(report.utilityBoundary.removed).toEqual([]);
    expect(report.utilityBoundary.allowlistBefore).toBe(LUCIDE_UTILITY_ALLOWLIST.size);
    expect(report.utilityBoundary.allowlistAfter).toBe(LUCIDE_UTILITY_ALLOWLIST.size);
    expect(report.utilityBoundary.questionable.length).toBeGreaterThan(0);
  });
});

describe("SCE-ICONS-11 semantic resolver", () => {
  it("classifies version-history History as utility, not history module", () => {
    const res = resolveLucideSemantic(
      "History",
      "components/admin/page-builder/PageBuilderClient.tsx",
      '<History className="h-4 w-4" /> Versionshistorie',
    );
    expect(res.category).toBe("UTILITY_ACTION");
  });

  it("flags Lucide Archive module semantics as legacy when master exists", () => {
    const res = resolveLucideSemantic(
      "Archive",
      "components/admin/example.tsx",
      "<Archive className=\"h-5 w-5\" />",
    );
    expect(res.category).toBe("SCE_DOMAIN_APPROVED");
    expect(res.sceMaster).toBe("archive");
    expect(res.legacyDespiteMaster).toBe(true);
  });
});
