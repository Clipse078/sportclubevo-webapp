/**
 * SCE-ICONS-V2-02 — monochrome system integration & product adoption gates.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  auditV2AuthoritativeArtworkIntegrity,
  fingerprintApprovedHeroMasterSvg,
  SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS,
  SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA,
} from "../masters/approved-hero-fingerprint";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
} from "../masters/approved-hero-meta";
import { SCE_SPECIMEN_OPTICAL_SIZES } from "../specimen/SceIconSpecimen";
import {
  buildSceV2MasterManifest,
  summarizeSceV2MasterManifest,
} from "../v2/v2-master-manifest";
import { runExpectedSemanticIconSlotAudit } from "@/lib/icons/expected-semantic-icon-slot-audit";
import { runIconColorOwnershipAudit } from "@/lib/icons/icon-color-ownership-audit";
import { runIconContainerAudit } from "@/lib/icons/icon-container-audit";
import { runLegacyProvisionalVisualAudit } from "@/lib/icons/legacy-provisional-visual-audit";
import { isSceApprovedMasterGlyph } from "../masters/approved-hero-glyphs";
import { SCE_ICON_REGISTRY } from "../registry";

const BRAND_HEX = /#(?:0b4aa2|f97316|fff|ffffff)\b/i;

describe("SCE-ICONS-V2-02 authoritative artwork", () => {
  it("validates 90 V2 SVG masters (viewBox, currentColor, safety)", () => {
    expect(SCE_APPROVED_MASTER_ICON_NAMES.length).toBe(90);
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      const src = readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8");
      expect(src).toMatch(/viewBox="0 0 64 64"/);
      expect(src).toMatch(/currentColor/);
      expect(src).not.toMatch(BRAND_HEX);
      expect(src).not.toMatch(/<script|<foreignObject|<text[\s>]|xlink:href|<image/i);
    }
  });

  it("protects frozen V2 artwork fingerprints", () => {
    expect(SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA).toBe(
      "daacf13071ac2dba43483809be4a42ca5d1af6a8",
    );
    const { mismatches } = auditV2AuthoritativeArtworkIntegrity();
    expect(mismatches).toEqual([]);
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[name])).toBe(
        SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[name],
      );
    }
  });
});

describe("SCE-ICONS-V2-02 manifest & React geometry", () => {
  it("marks all concepts APPROVED with currentColor-ready artwork", () => {
    const summary = summarizeSceV2MasterManifest();
    expect(summary.concepts).toBe(90);
    expect(summary.approved).toBe(90);
    expect(summary.awaitingArtwork).toBe(0);
    expect(summary.currentColorReady).toBe(90);
    expect(summary.integrated).toBe(90);
    const manifest = buildSceV2MasterManifest();
    for (const row of manifest) {
      expect(row.v2ArtworkStatus).toBe("APPROVED");
      expect(row.currentColorReady).toBe(true);
      expect(row.replacementRequired).toBe(false);
      expect(row.integrationStatus).toBe("COMPLETE");
    }
  });

  it("routes registry approved masters through V2 monochrome React geometry", () => {
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(isSceApprovedMasterGlyph(SCE_ICON_REGISTRY[name].Glyph)).toBe(true);
      const glyphFile = readFileSync(
        join(process.cwd(), "components/design-system/icons/masters/approved-hero-glyphs.tsx"),
        "utf8",
      );
      expect(glyphFile).not.toMatch(/var\(--sce-icon-/);
    }
  });
});

describe("SCE-ICONS-V2-02 expected slot & legacy closure", () => {
  it(
    "closes governed semantic icon-slot debt",
    () => {
      const report = runExpectedSemanticIconSlotAudit();
      expect(report.totals.SCE_WRONG).toBe(0);
      expect(report.totals.LEGACY_DOMAIN).toBe(0);
      expect(report.totals.MISSING_EXPECTED_ICON).toBe(0);
      expect(report.totals.UNKNOWN_REQUIRES_REVIEW).toBe(0);
    },
    60_000,
  );

  it("classifies legacy/provisional visual substitutes", () => {
    const report = runLegacyProvisionalVisualAudit();
    const unclassifiedInline = report.records.filter(
      (r) => r.category === "INLINE_SVG" && r.classification === "REQUIRES_REVIEW",
    );
    expect(unclassifiedInline.length).toBe(0);
  });
});

describe("SCE-ICONS-V2-02 container & color posture", () => {
  it("closes shared icon-container optical debt", () => {
    const report = runIconContainerAudit();
    expect(report.tooSmallForContainer).toBe(0);
    expect(report.containerDominant).toBe(0);
    expect(report.inconsistentOpticalSize).toBe(0);
  });

  it("eliminates V1 master-owned color in approved master React sources", () => {
    const report = runIconColorOwnershipAudit();
    const masterOwned = report.records.filter(
      (r) =>
        r.file.startsWith("components/design-system/icons/masters/") &&
        r.ownership === "MASTER_OWNED_COLOR",
    );
    expect(masterOwned.length).toBe(0);
  });
});

describe("SCE-ICONS-V2-02 specimen surface", () => {
  it("documents V2 optical tiers on the specimen page", () => {
    expect(SCE_SPECIMEN_OPTICAL_SIZES).toEqual([16, 18, 20, 24, 28, 32, 48, 64]);
    const specimen = readFileSync(
      join(process.cwd(), "components/design-system/icons/specimen/SceIconSpecimen.tsx"),
      "utf8",
    );
    expect(specimen).toContain("V2 canonical");
    expect(specimen).toContain("STATE_PREVIEW");
    expect(readdirSync(join(process.cwd(), "public/images/icons")).filter((f) => f.endsWith(".svg")).length).toBe(
      90,
    );
  });
});
