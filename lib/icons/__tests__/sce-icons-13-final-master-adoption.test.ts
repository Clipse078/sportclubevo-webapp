/**
 * SCE-ICONS-13 — final semantic master integration & domain adoption.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_APPROVED_FINAL_SEMANTIC_MASTER_ICON_NAMES,
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "@/components/design-system/icons/masters/approved-hero-meta";
import {
  SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS,
  SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS,
  fingerprintApprovedHeroMasterSvg,
} from "@/components/design-system/icons/masters/approved-hero-fingerprint";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";
import { runWebappIconCoverageAudit } from "@/lib/icons/webapp-icon-coverage-audit";
import { MISSING_SCE_SEMANTICS } from "@/lib/icons/missing-sce-semantics";

const FINAL_TWELVE = [...SCE_APPROVED_FINAL_SEMANTIC_MASTER_ICON_NAMES] as const;

describe("SCE-ICONS-13 final semantic masters", () => {
  it("registers all 12 final masters with approved geometry", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    for (const name of FINAL_TWELVE) {
      const entry = SCE_ICON_REGISTRY[name];
      expect(entry.geometrySource).toBe("approved-master");
      expect(entry.masterAssetPath).toBe(SCE_APPROVED_MASTER_ASSETS[name]);
      expect(existsSync(join(process.cwd(), entry.masterAssetPath!))).toBe(true);
    }
  });

  it("validates final SVG artwork (64×64, vector-only)", () => {
    for (const name of FINAL_TWELVE) {
      const src = readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8");
      expect(src).toMatch(/viewBox="0 0 64 64"/);
      expect(src).not.toMatch(/<script/i);
      expect(src).not.toMatch(/<text[\s>]/i);
      expect(src).not.toMatch(/<foreignObject/i);
      expect(src).not.toMatch(/<image|xlink:href|href="http/i);
    }
  });

  it("records stable V2 authoritative fingerprints for final masters", () => {
    for (const name of FINAL_TWELVE) {
      expect(SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS[name]).toBe(
        SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[name],
      );
      expect(fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[name])).toBe(
        SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[name],
      );
    }
    expect(Object.keys(SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS).length).toBe(90);
  });

  it("clears domain icon debt across the webapp audit", () => {
    const report = runWebappIconCoverageAudit();
    expect(MISSING_SCE_SEMANTICS).toEqual([]);
    expect(report.classificationTotals.SCE_DOMAIN_MISSING_MASTER).toBe(0);
    expect(report.classificationTotals.UNKNOWN_REQUIRES_REVIEW).toBe(0);
    expect(report.legacyDomainReport.legacyWithAvailableMaster).toBe(0);
    expect(report.routeMatrix.every((r) => r.consistency !== "MIXED_MISSING_MASTER")).toBe(true);
    expect(report.routeMatrix.every((r) => r.consistency !== "LEGACY_MIX")).toBe(true);
    expect(report.responsiveMobile.mobileMissingMaster).toBe(0);
    expect(report.responsiveMobile.mobileLegacyDomain).toBe(0);
    expect(report.navCompleteness.reachableDestinations).toBe(60);
  });

  it("uses competition master on veranstaltungen KPI total", () => {
    const { veranstaltungenDeepDive } = runWebappIconCoverageAudit();
    expect(veranstaltungenDeepDive.KPI_TOTAL.classification).toContain("SCE_DOMAIN_APPROVED");
    expect(veranstaltungenDeepDive.missingMasters).toEqual([]);
  });

  it("lists 90 approved master SVG files on disk", () => {
    const svgCount = readdirSync(join(process.cwd(), "public/images/icons")).filter((f) =>
      f.endsWith(".svg"),
    ).length;
    expect(svgCount).toBe(90);
  });
});
