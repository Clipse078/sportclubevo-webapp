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

  it("keeps architecture implemented while authenticated visual evidence stays pending without browser proof", () => {
    expect(SCE_DS2_07B_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.pendingAuthenticatedVisualCount).toBe(214);
    for (const row of SCE_DS2_07G_VERIFICATION_MATRIX) {
      expect(row.architectureAdoption).toBe("IMPLEMENTED");
      expect(row.automatedChecks).toBe("PASSED");
      expect(row.authenticatedVisual).toBe("PENDING");
      expect(row.desktop).toBe("PENDING");
      expect(row.tablet).toBe("PENDING");
      expect(row.mobile).toBe("PENDING");
      expect(row.evidenceReferences).toEqual([]);
    }
  });

  it("runs static canonical audit without blocking defects", () => {
    expect(SCE_DS2_07G_STATIC_AUDIT.entriesScanned).toBe(214);
    expect(SCE_DS2_07G_STATIC_AUDIT.defects).toEqual([]);
  });

  it("documents batch-1 high-risk queue size separately from verified count", () => {
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskBatchSize).toBeGreaterThan(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskVerifiedCount).toBe(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.contrastSmokeDebt.length).toBeGreaterThan(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.trackedBaselineDebt.length).toBeGreaterThan(0);
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
    expect(regenerated).toContain('"matrixVersion": "2026-11-10-batch-1"');
  });
});
