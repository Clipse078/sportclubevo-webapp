import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_FINGERPRINT_ALGORITHM_ID,
  COMPLIANCE_FINGERPRINT_INPUT_FILES,
  computeComplianceFingerprint,
} from "../compliance-fingerprint";
import { externalValidationMatrixCases } from "../fixtures/external-validation-matrix-fixtures";
import { generateExternalValidationPack } from "../swiss-qr-external-validation-pack";

describe("BILLING-QR-04A external validation pack", () => {
  it("computes a stable compliance fingerprint over fixed inputs", () => {
    const repoRoot = path.join(process.cwd());
    const first = computeComplianceFingerprint(repoRoot);
    const second = computeComplianceFingerprint(repoRoot);
    expect(first.fingerprintSha256).toBe(second.fingerprintSha256);
    expect(first.algorithm).toBe(COMPLIANCE_FINGERPRINT_ALGORITHM_ID);
    expect(first.fileInputs).toHaveLength(COMPLIANCE_FINGERPRINT_INPUT_FILES.length);
    expect(first.dependencyInputs.map((d) => d.name).sort()).toEqual(
      ["pngjs", "qrcode", "swissqrbill"].sort(),
    );
  });

  it("generates internally validated artifacts and manifest", async () => {
    const repoRoot = process.cwd();
    const outDir = await mkdtemp(path.join(os.tmpdir(), "qr-04a-pack-"));
    try {
      const result = await generateExternalValidationPack({
        repoRoot,
        outDir,
        commitSha: "test-commit-sha",
        qr03BaselineSha: "44be3e7b3d99c44ba12fb2b5276c9adcd19633e1",
      });

      expect(result.manifest.validation.status).toBe("PENDING_EXTERNAL_SIX_VALIDATION");
      expect(result.manifest.validation.validatedAt).toBeNull();
      expect(result.manifest.artifacts).toHaveLength(externalValidationMatrixCases.length);
      expect(result.manifest.principalSixUpload.firstFile).toBe("sce-realistic-chf.spc.txt");

      const manifestRaw = await readFile(path.join(outDir, "manifest.json"), "utf8");
      const parsed = JSON.parse(manifestRaw) as { validation: { status: string } };
      expect(parsed.validation.status).toBe("PENDING_EXTERNAL_SIX_VALIDATION");

      for (const artifact of result.manifest.artifacts) {
        const spc = artifact.files.find((f) => f.artifactType === "spc.txt");
        expect(spc).toBeDefined();
        const spcContent = await readFile(path.join(outDir, spc!.filename), "utf8");
        expect(spc!.sha256).toBe(createHash("sha256").update(spcContent).digest("hex"));
      }

      const pdfEntry = result.manifest.crossBankCandidate;
      expect(pdfEntry.pdfFilename).toBe("sce-realistic-chf.pdf");
      await readFile(path.join(outDir, pdfEntry.pdfFilename));
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
