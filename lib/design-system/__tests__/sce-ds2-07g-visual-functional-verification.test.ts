/**
 * SCE-DS2-07G — verification matrix governance and batch-3 evidence contract.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCE_DS2_07B_SUMMARY } from "@/lib/design-system/sce-ds2-07b-route-registry";
import {
  SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION,
  SCE_DS2_07G_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-07g-meta";
import {
  SCE_DS2_07G_STATIC_AUDIT,
  SCE_DS2_07G_VERIFICATION_MATRIX,
  SCE_DS2_07G_VERIFICATION_SUMMARY,
} from "@/lib/design-system/sce-ds2-07g-verification-matrix";

const ROOT = process.cwd();

describe("SCE-DS2-07G visual and functional verification", () => {
  it("covers every DS2-07G canonical route in the verification matrix", () => {
    expect(SCE_DS2_07B_SUMMARY.outstandingByPackage["DS2-07G"]).toBe(215);
    expect(SCE_DS2_07G_VERIFICATION_MATRIX).toHaveLength(215);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.totalCanonicalRoutes).toBe(215);
    expect(new Set(SCE_DS2_07G_VERIFICATION_MATRIX.map((row) => row.sourceFile)).size).toBe(215);
  });

  it("uses the batch-9 evidence contract in the matrix summary", () => {
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.evidenceContractVersion).toBe(
      SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION,
    );
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.matrixVersion).toBe(SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION);
    expect(SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION).toBe("2026-11-11-batch-11");
  });

  it("allows NOT_APPLICABLE functional only for governed placeholder or intercept routes", async () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json"), "utf8"),
    );
    const rows = Object.values(manifest.bySourceFile ?? {}) as Array<{
      dimensions?: { functional?: { status?: string; details?: string[] } };
    }>;
    for (const row of rows) {
      if (row.dimensions?.functional?.status !== "NOT_APPLICABLE") continue;
      const detail = row.dimensions.functional.details?.join(" ") ?? "";
      expect(detail).toMatch(/FUTURE_MODULE_PLACEHOLDER|INTERCEPT_SLOT/);
    }
  });

  it("maps channel VERIFIED only from matching dimension PASS (never from navigation alone)", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json"), "utf8"),
    );
    for (const row of Object.values(manifest.bySourceFile ?? {}) as Array<{
      dimensions?: {
        accessibility?: { status?: string };
        functional?: { status?: string };
        visual?: { screenshotReviewed?: boolean };
      };
      accessibility?: string;
      functional?: string;
      authenticatedVisual?: string;
    }>) {
      if (row.accessibility === "VERIFIED") {
        expect(row.dimensions?.accessibility?.status).toBe("PASS");
      }
      if (row.functional === "VERIFIED") {
        expect(row.dimensions?.functional?.status).toBe("PASS");
      }
      if (row.authenticatedVisual === "VERIFIED") {
        expect(row.dimensions?.visual?.screenshotReviewed).toBe(true);
      }
    }
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
  });

  it("preserves high-risk responsive evidence while full closure stays pending", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json"), "utf8"),
    );
    const highRiskSourceFiles = new Set(Object.keys(manifest.bySourceFile ?? {}));
    const highRiskRows = SCE_DS2_07G_VERIFICATION_MATRIX.filter((row) =>
      highRiskSourceFiles.has(row.sourceFile),
    );
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskBatchSize).toBe(41);
    expect(highRiskRows.length).toBeGreaterThanOrEqual(41);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.verifiedAuthenticatedVisualCount).toBe(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskVerifiedCount).toBe(0);
    expect(SCE_DS2_07G_VERIFICATION_SUMMARY.highRiskResponsiveVerifiedCount).toBeGreaterThanOrEqual(39);
  });

  it("runs static canonical audit without blocking defects", () => {
    expect(SCE_DS2_07G_STATIC_AUDIT.entriesScanned).toBe(215);
    expect(SCE_DS2_07G_STATIC_AUDIT.defects).toEqual([]);
  });

  it("commits batch-3 dimension fields on recorded browser evidence", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json"), "utf8"),
    );
    expect(manifest.evidenceContractVersion).toBe(SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION);
    expect(manifest.highRiskRoutesAttempted).toBe(41);
    expect(Object.keys(manifest.bySourceFile).length).toBeGreaterThanOrEqual(100);
    expect(manifest.batch3EvidenceRows ?? 0).toBeGreaterThanOrEqual(60);
    const rows = Object.values(manifest.bySourceFile) as Array<{
      dimensions: {
        authentication: { status: string };
        visual: { screenshotReviewed?: boolean };
      };
    }>;
    expect(rows.every((row) => row.dimensions.authentication.status)).toBe(true);
    const reviewed = rows.filter((row) => row.dimensions.visual.screenshotReviewed === true);
    const pendingReview = rows.filter((row) => row.dimensions.visual.screenshotReviewed === false);
    expect(reviewed.length).toBeGreaterThanOrEqual(5);
    expect(pendingReview.length).toBeGreaterThan(0);
  });

  it("prefers never-sampled routes at the front of the batch-3 queue", async () => {
    const { selectBatch3Routes } = await import("../../../scripts/lib/sce-ds2-07g-verification.mjs");
    const existing = { "app/(admin)/dashboard/page.tsx": { dimensions: {} } };
    const first = selectBatch3Routes({ limit: 3, offset: 0, evidenceBySource: existing })[0];
    expect(existing[first.sourceFile as keyof typeof existing]).toBeUndefined();
  });

  it("commits batch-11 release risk register with zero release-blocking findings", () => {
    const register = JSON.parse(
      readFileSync(join(ROOT, "lib/design-system/sce-ds2-07g-release-risk-register.json"), "utf8"),
    );
    expect(register.summary.recommendation).toMatch(/^B\.CONDITIONALLY_READY$/);
    expect(register.summary.releaseBlockingCount).toBe(0);
    expect(register.gates.fullVerificationCompletion.fullyVerifiedCount).toBe(0);
    expect(register.findings.length).toBeGreaterThan(100);
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
    expect(regenerated).toContain(`"matrixVersion": "${SCE_DS2_07G_EVIDENCE_CONTRACT_VERSION}"`);
  });
});
