/**
 * SCE-DS2-07G — verification matrix governance and batch-1 closure checks.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCE_DS2_07B_SUMMARY } from "@/lib/design-system/sce-ds2-07b-route-registry";
import { SCE_DS2_07G_PACKAGE_KEY } from "@/lib/design-system/sce-ds2-07g-meta";
import {
  SCE_DS2_07G_STATIC_AUDIT,
  SCE_DS2_07G_VERIFICATION_MATRIX,
  SCE_DS2_07G_VERIFICATION_SUMMARY,
} from "@/lib/design-system/sce-ds2-07g-verification-matrix";

const ROOT = process.cwd();

describe("SCE-DS2-07G visual and functional verification", () => {
  it("covers every DS2-07G canonical route in the verification matrix", () => {
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(214);
    expect(SCE_DS2_07G_VERIFICATION_MATRIX).toHaveLength(214);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.totalCanonicalRoutes).toBe(214);
    expect(new Set(SCE_DS2_07G_VERIFICATION_MATRIX.map((row) => row.sourceFile)).size).toBe(214);
  });

  it("derives authenticated visual status from recorded browser evidence only", () => {
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    const verifiedRows = SCE_DS2_07G_VERIFICATION_MATRIX.filter(
      (row) => row.authenticatedVisual === "VERIFIED",
    );
    const pendingRows = SCE_DS2_07G_VERIFICATION_MATRIX.filter(
      (row) => row.authenticatedVisual === "PENDING",
    );
    expect(verifiedRows.length).toBe(SCE_DS2_07G_VERIFICATION_SUMMARY.verifiedAuthenticatedVisualCount);
    expect(pendingRows.length).toBe(SCE_DS2_07G_VERIFICATION_SUMMARY.pendingAuthenticatedVisualCount);
    expect(verifiedRows.length + pendingRows.length).toBe(214);

    for (const row of verifiedRows) {
      expect(row.architectureAdoption).toBe("IMPLEMENTED");
      expect(row.automatedChecks).toBe("PASSED");
      expect(row.evidenceReferences.length).toBeGreaterThan(0);
      expect(row.desktop).toBe("VERIFIED");
      expect(row.compactDesktop).toBe("VERIFIED");
      expect(row.tablet).toBe("VERIFIED");
      expect(row.mobile).toBe("VERIFIED");
    }

    for (const row of pendingRows) {
      expect(row.architectureAdoption).toBe("IMPLEMENTED");
      expect(row.automatedChecks).toBe("PASSED");
      expect(row.evidenceReferences).toEqual([]);
    }
  });

  it("runs static canonical audit without blocking defects", () => {
    expect(SCE_DS2_07G_STATIC_AUDIT.entriesScanned).toBe(214);
    expect(SCE_DS2_07G_STATIC_AUDIT.defects).toEqual([]);
  });

  it("documents batch-2 high-risk closure separately from programme-wide pending count", () => {
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskBatchSize).toBe(41);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskVerifiedCount).toBe(41);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.verifiedAuthenticatedVisualCount).toBeGreaterThanOrEqual(41);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.contrastSmokeDebt.length).toBeGreaterThan(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.trackedBaselineDebt.length).toBeGreaterThan(0);
  });

  it("commits batch-2 evidence manifest for high-risk routes", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json"), "utf8"),
    );
    expect(manifest.batch).toBe("high-risk-batch-2");
    expect(manifest.highRiskRoutesAttempted).toBe(41);
    expect(manifest.highRiskRoutesVerified).toBe(41);
    expect(Object.keys(manifest.bySourceFile)).toHaveLength(41);
  });

  it("regenerates the matrix from scripts without drift", () => {
    execSync("node scripts/sce-ds2-07g-build-verification-matrix.mjs", {
      cwd: ROOT,
      stdio: "pipe",
    });
    const regenerated = readFileSync(
      join(ROOT, "lib/design-system/sce-ds2-07g-verification-matrix.ts"),
      "utf8",
    );
    expect(regenerated).toContain(SCE_DS2_07G_PACKAGE_KEY);
    expect(regenerated).toContain('"matrixVersion": "2026-11-10-batch-2"');
  });
});
