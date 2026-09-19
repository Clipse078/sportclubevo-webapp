import { execSync } from "node:child_process";
import path from "node:path";
import { generateExternalValidationPack } from "../lib/billing/swiss-qr-compliance/swiss-qr-external-validation-pack";

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "artifacts", "billing-qr-04a");
  const commitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const qr03BaselineSha =
    process.env.QR03_BASELINE_SHA?.trim() || "44be3e7b3d99c44ba12fb2b5276c9adcd19633e1";

  const result = await generateExternalValidationPack({
    repoRoot,
    outDir,
    commitSha,
    qr03BaselineSha,
  });

  console.log(`\nBILLING-QR-04A validation pack directory:\n${result.outDir}\n`);
  console.log("Generated files:");
  for (const file of result.generatedFiles) {
    console.log(`  - ${file}`);
  }

  console.log("\nSIX-target artifacts:");
  for (const artifact of result.manifest.artifacts) {
    for (const file of artifact.files) {
      if (file.artifactType === "pdf") {
        continue;
      }
      console.log(
        `  ${artifact.caseId} | ${file.filename} | ${file.sha256} | ${artifact.purpose}`,
      );
    }
  }

  console.log(
    `\nFIRST FILE MICHAEL SHOULD UPLOAD TO SIX: ${result.manifest.principalSixUpload.firstFile}`,
  );
  console.log(`Cross-bank PDF SHA-256: ${result.manifest.crossBankCandidate.pdfSha256}`);
  console.log(`Compliance fingerprint: ${result.manifest.engine.complianceFingerprint.sha256}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
