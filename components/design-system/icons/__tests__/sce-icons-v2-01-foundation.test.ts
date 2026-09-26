/**
 * SCE-ICONS-V2-01 — monochrome migration foundation & audits.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "../masters/approved-hero-meta";
import { SCE_ICON_REGISTRY_NAMES } from "../registry";
import { SCE_SPECIMEN_OPTICAL_SIZES } from "../specimen/SceIconSpecimen";
import { buildSceV1SystemBaseline } from "../v2/v1-system-baseline";
import {
  buildV1MasterOpticalAudit,
  summarizeV1MasterOpticalAudit,
} from "../v2/v1-master-optical-audit";
import {
  buildSceV2MasterManifest,
  summarizeSceV2MasterManifest,
} from "../v2/v2-master-manifest";
import { SCE_V2_ARTWORK_HANDOFF_BATCHES } from "../v2/v2-artwork-handoff-batches";
import { SCE_V2_REGRESSION_GUARDS } from "../v2/v2-regression-architecture";
import { runExpectedSemanticIconSlotAudit } from "@/lib/icons/expected-semantic-icon-slot-audit";
import { runIconColorOwnershipAudit } from "@/lib/icons/icon-color-ownership-audit";
import { runIconContainerAudit } from "@/lib/icons/icon-container-audit";
import { runLegacyProvisionalVisualAudit } from "@/lib/icons/legacy-provisional-visual-audit";

describe("SCE-ICONS-V2-01 V1 baseline freeze", () => {
  it("captures 90 approved masters and registry identities without mutating fingerprints", () => {
    const baseline = buildSceV1SystemBaseline();
    expect(baseline.system).toBe("SCE Icon System V1");
    expect(baseline.approvedMasters).toBe(90);
    expect(baseline.registryNames).toBe(SCE_ICON_REGISTRY_NAMES.length);
    expect(baseline.registryNames).toBeGreaterThanOrEqual(104);
    expect(baseline.masters).toHaveLength(90);
    for (const row of baseline.masters) {
      expect(row.currentFingerprint).toBe(row.baselineFingerprint);
      expect(row.currentFingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});

describe("SCE-ICONS-V2-01 90-master optical audit", () => {
  it("audits every approved master with structured recommendations", () => {
    const records = buildV1MasterOpticalAudit();
    expect(records).toHaveLength(90);
    const names = new Set(records.map((r) => r.name));
    expect(names.size).toBe(90);
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(names.has(name)).toBe(true);
    }
    const summary = summarizeV1MasterOpticalAudit(records);
    expect(summary.total).toBe(90);
    expect(summary.keepGeometryMonochrome + summary.simplify + summary.redraw).toBe(90);
    expect(summary.legibility20PxPass + summary.legibility20PxReview + summary.legibility20PxFail).toBe(
      90,
    );
  });

  it("includes product-owner weak master flags", () => {
    const byName = new Map(buildV1MasterOpticalAudit().map((r) => [r.name, r]));
    expect(byName.get("training")?.legibility20Px).toBe("FAIL");
    expect(byName.get("page")?.legibility24Px).toBe("FAIL");
    expect(byName.get("match")?.silhouetteStrength).toBe("STRONG");
    expect(byName.get("tournament")?.recommendation).toBe("KEEP_GEOMETRY_MONOCHROME");
  });
});

describe("SCE-ICONS-V2-01 manifest & handoff", () => {
  it("builds V2 manifest rows awaiting product-owner artwork", () => {
    const manifest = buildSceV2MasterManifest();
    expect(manifest).toHaveLength(90);
    const summary = summarizeSceV2MasterManifest(manifest);
    expect(summary.concepts).toBe(90);
    expect(summary.awaitingArtwork).toBe(90);
    expect(summary.currentColorReady).toBe(0);
    expect(summary.replacementRequired).toBe(90);
    for (const row of manifest) {
      expect(row.v2ArtworkStatus).toBe("AWAITING_PRODUCT_OWNER_ARTWORK");
      expect(row.currentColorCompliance).toBe("V1_NON_COMPLIANT");
    }
  });

  it("partitions handoff batches across all 90 masters", () => {
    const batched = new Set(
      SCE_V2_ARTWORK_HANDOFF_BATCHES.flatMap((b) => b.iconNames),
    );
    expect(batched.size).toBe(90);
    expect(SCE_V2_ARTWORK_HANDOFF_BATCHES.length).toBe(5);
    for (const name of SCE_APPROVED_MASTER_ICON_NAMES) {
      expect(batched.has(name)).toBe(true);
    }
  });

  it("registers future regression guards without failing V1 state", () => {
    expect(SCE_V2_REGRESSION_GUARDS.length).toBeGreaterThanOrEqual(7);
    expect(SCE_V2_REGRESSION_GUARDS.map((g) => g.id)).toContain("CURRENTCOLOR_GUARD");
    expect(SCE_V2_REGRESSION_GUARDS.map((g) => g.id)).toContain("EXPECTED_SLOT_GUARD");
  });
});

describe("SCE-ICONS-V2-01 expected semantic icon-slot audit", () => {
  it(
    "detects governed slots including missing module iconography",
    () => {
      const report = runExpectedSemanticIconSlotAudit();
      expect(report.slots.length).toBeGreaterThan(50);
      expect(report.totals.SCE_CORRECT).toBeGreaterThan(0);
      expect(report.totals.MISSING_EXPECTED_ICON).toBeGreaterThan(0);
      expect(report.knownQaSurfaces["/dashboard"]?.slotCount).toBeGreaterThan(0);
      expect(report.knownQaSurfaces["/dashboard/org-units"]?.slotCount).toBeGreaterThan(0);
      expect(report.knownQaSurfaces["/dashboard/website"]?.route).toBe("/dashboard/website");
    },
    60_000,
  );
});

describe("SCE-ICONS-V2-01 supporting audits", () => {
  it("reports color ownership blockers for V2 currentColor", () => {
    const report = runIconColorOwnershipAudit();
    expect(report.totals.MASTER_OWNED_COLOR).toBeGreaterThan(100);
    expect(report.blockersForV2.length).toBeGreaterThan(0);
  });

  it("audits shared icon container patterns", () => {
    const report = runIconContainerAudit();
    expect(report.components.length).toBeGreaterThan(0);
  });

  it("scans legacy/provisional visual substitutes", () => {
    const report = runLegacyProvisionalVisualAudit();
    expect(report.totals.INITIALS).toBeGreaterThan(0);
  });
});

describe("SCE-ICONS-V2-01 specimen optical QA surface", () => {
  it("exposes production optical sizes and monochrome preview wiring", () => {
    expect(SCE_SPECIMEN_OPTICAL_SIZES).toEqual([16, 18, 20, 24, 28, 32, 48, 64]);
    const specimen = readFileSync(
      join(process.cwd(), "components/design-system/icons/specimen/SceIconSpecimen.tsx"),
      "utf8",
    );
    expect(specimen).toContain("MONOCHROME_PREVIEW_CLASS");
    expect(specimen).toContain("monochromePreview");
    expect(specimen).toContain("SCE_ICON_V2_DESIGN_CONTRACT");
  });

  it("documents V2 design contract", () => {
    const contract = readFileSync(
      join(process.cwd(), "components/design-system/icons/v2/SCE_ICON_V2_DESIGN_CONTRACT.md"),
      "utf8",
    );
    expect(contract).toContain("currentColor");
    expect(contract).toContain("20–24px");
  });
});
