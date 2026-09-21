import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Deterministic compliance fingerprint for the Swiss QR engine.
 *
 * Algorithm (v1):
 * 1. Take COMPLIANCE_FINGERPRINT_INPUT_FILES in sorted lexicographic order (fixed list).
 * 2. For each relative path, read file bytes from repository root and compute SHA-256 hex.
 * 3. Append lines to a UTF-8 buffer: `file:<relativePath>\nsha256:<hex>\n`
 * 4. Append dependency pins from package.json (qrcode, pngjs, swissqrbill): `dep:<name>@<version>\n`
 * 5. SHA-256 hex of the full buffer is the compliance fingerprint.
 *
 * Any change to listed sources, cross asset, or pinned QR dependencies changes the fingerprint
 * and signals that external SIX revalidation may be required (see QR-04A governance docs).
 */
export const COMPLIANCE_FINGERPRINT_ALGORITHM_ID = "sce-swiss-qr-compliance-fingerprint-v1" as const;

export const COMPLIANCE_FINGERPRINT_INPUT_FILES = [
  "lib/billing/invoice-pdf/assets/six-swiss-qr-black-white-cross-7mm.png",
  "lib/billing/invoice-pdf/generate-invoice-pdf.ts",
  "lib/billing/invoice-pdf/render-swiss-payment-slip.ts",
  "lib/billing/invoice-pdf/resolve-invoice-payment-spc.ts",
  "lib/billing/invoice-pdf/swiss-qr-code-image.ts",
  "lib/billing/invoice-pdf/swiss-qr-recognition-cross-asset.ts",
  "lib/billing/swiss-qr-compliance/assert-invoice-swiss-qr-delivery-compliance.ts",
  "lib/billing/swiss-qr-compliance/build-swiss-qr-bill-from-instruction.ts",
  "lib/billing/swiss-qr-compliance/decode-swiss-qr-png.ts",
  "lib/billing/swiss-qr-compliance/extract-pdf-embedded-pngs.ts",
  "lib/billing/swiss-qr-compliance/run-swiss-qr-compliance.ts",
  "lib/billing/swiss-qr-compliance/serialize-canonical-swiss-qr-payload.ts",
  "lib/billing/swiss-qr-compliance/six-qr-bill-standard.ts",
  "lib/billing/swiss-qr-compliance/swiss-qr-bill-data.ts",
  "lib/billing/swiss-qr-compliance/swiss-qr-compliance-codes.ts",
  "lib/billing/swiss-qr-compliance/validate-swiss-qr-bill.ts",
  "lib/billing/swiss-qr-compliance/validate-swiss-qr-character-set.ts",
  "lib/billing/swiss-qr/swiss-bank-account-selection.ts",
  "lib/billing/swiss-qr/swiss-iban.ts",
  "lib/billing/swiss-qr/swiss-modulo10.ts",
  "lib/billing/swiss-qr/swiss-qrr.ts",
  "lib/billing/swiss-qr/swiss-reference-compat.ts",
  "lib/billing/swiss-qr/swiss-scor.ts",
  "lib/billing/swiss-qr/swiss-spc-payload.ts",
  "lib/billing/swiss-qr/swiss-structured-address.ts",
] as const;

const COMPLIANCE_FINGERPRINT_DEPENDENCIES = ["qrcode", "pngjs", "swissqrbill"] as const;

export type ComplianceFingerprintResult = {
  algorithm: typeof COMPLIANCE_FINGERPRINT_ALGORITHM_ID;
  fingerprintSha256: string;
  fileInputs: Array<{ path: string; sha256: string }>;
  dependencyInputs: Array<{ name: string; version: string }>;
};

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function computeComplianceFingerprint(repoRoot: string): ComplianceFingerprintResult {
  const fileInputs: ComplianceFingerprintResult["fileInputs"] = [];
  let buffer = "";

  for (const relativePath of COMPLIANCE_FINGERPRINT_INPUT_FILES) {
    const absolute = path.join(repoRoot, relativePath);
    const content = readFileSync(absolute);
    const fileHash = sha256Hex(content);
    fileInputs.push({ path: relativePath, sha256: fileHash });
    buffer += `file:${relativePath}\nsha256:${fileHash}\n`;
  }

  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const dependencyInputs: ComplianceFingerprintResult["dependencyInputs"] = [];
  for (const depName of COMPLIANCE_FINGERPRINT_DEPENDENCIES) {
    const version =
      packageJson.dependencies?.[depName] ??
      packageJson.devDependencies?.[depName] ??
      "missing";
    dependencyInputs.push({ name: depName, version });
    buffer += `dep:${depName}@${version}\n`;
  }

  return {
    algorithm: COMPLIANCE_FINGERPRINT_ALGORITHM_ID,
    fingerprintSha256: sha256Hex(buffer),
    fileInputs,
    dependencyInputs,
  };
}
