import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_CROSS_BANK_CASE_ID,
  generateCrossBankAcceptancePack,
} from "../swiss-qr-cross-bank-acceptance-pack";
import { SYNTHETIC_QRR_REF } from "../fixtures/external-validation-matrix-fixtures";

describe("BILLING-QR-04B cross-bank acceptance pack", () => {
  it("generates reproducible canonical synthetic artifacts with full internal round-trips", async () => {
    const repoRoot = process.cwd();
    const outDir = await mkdtemp(path.join(os.tmpdir(), "qr-04b-pack-"));
    try {
      const first = await generateCrossBankAcceptancePack({
        repoRoot,
        outDir,
        commitSha: "test-commit-sha",
        stageBaselineSha: "b628a5a98d7ad6c655b195e6a9e0570d3a593d29",
      });

      expect(first.manifest.canonicalFixture.caseId).toBe(CANONICAL_CROSS_BANK_CASE_ID);
      expect(first.manifest.prerequisite.qr04aExternalSixValidation).toBe("PASS");
      expect(first.manifest.internalValidation.complianceEngine).toBe("PASS");
      expect(first.manifest.bankChannels.ubs.result).toBe("NOT_TESTED");

      const spc = first.manifest.artifacts.find((a) => a.artifactType === "spc.txt");
      const qr = first.manifest.artifacts.find((a) => a.artifactType === "qr.png");
      const pdf = first.manifest.artifacts.find((a) => a.artifactType === "pdf");
      expect(spc?.filename).toBe(`${CANONICAL_CROSS_BANK_CASE_ID}.spc.txt`);
      expect(qr?.filename).toBe(`${CANONICAL_CROSS_BANK_CASE_ID}.qr.png`);
      expect(pdf?.filename).toBe(`${CANONICAL_CROSS_BANK_CASE_ID}.pdf`);
      expect(spc?.canonicalPayloadSha256).toBe(qr?.canonicalPayloadSha256);
      expect(first.manifest.canonicalFixture.paymentReviewExpectations.reference).toBe(SYNTHETIC_QRR_REF);

      const spcContent = await readFile(path.join(outDir, spc!.filename), "utf8");
      expect(spc!.sha256).toBe(createHash("sha256").update(spcContent).digest("hex"));

      const outDir2 = await mkdtemp(path.join(os.tmpdir(), "qr-04b-pack-"));
      try {
        const second = await generateCrossBankAcceptancePack({
          repoRoot,
          outDir: outDir2,
          commitSha: "test-commit-sha",
          stageBaselineSha: "b628a5a98d7ad6c655b195e6a9e0570d3a593d29",
        });
        expect(second.manifest.artifacts.map((a) => a.sha256)).toEqual(
          first.manifest.artifacts.map((a) => a.sha256),
        );
      } finally {
        await rm(outDir2, { recursive: true, force: true });
      }
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
