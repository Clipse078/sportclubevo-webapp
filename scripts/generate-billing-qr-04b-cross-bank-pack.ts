import { execSync } from "node:child_process";
import path from "node:path";
import { generateCrossBankAcceptancePack } from "../lib/billing/swiss-qr-compliance/swiss-qr-cross-bank-acceptance-pack";

async function main() {
  const repoRoot = process.cwd();
  const outDir = path.join(repoRoot, "artifacts", "billing-qr-04b");
  const commitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const stageBaselineSha =
    process.env.QR04B_STAGE_BASELINE_SHA?.trim() || "b628a5a98d7ad6c655b195e6a9e0570d3a593d29";

  const result = await generateCrossBankAcceptancePack({
    repoRoot,
    outDir,
    commitSha,
    stageBaselineSha,
  });

  console.log(`\nBILLING-QR-04B cross-bank acceptance pack:\n${result.outDir}\n`);
  console.log("Generated files:");
  for (const file of result.generatedFiles) {
    console.log(`  - ${file}`);
  }

  console.log("\nCanonical fixture (synthetic only):");
  console.log(`  caseId: ${result.manifest.canonicalFixture.caseId}`);
  for (const artifact of result.manifest.artifacts) {
    console.log(`  ${artifact.filename} | ${artifact.sha256}`);
  }

  console.log("\nInternal validation:");
  console.log(`  ${JSON.stringify(result.manifest.internalValidation)}`);
  console.log(`\nCompliance fingerprint: ${result.manifest.engine.complianceFingerprint.sha256}`);
  console.log("\nBank channels: UBS, Raiffeisen, PostFinance — NOT TESTED until manual evidence is recorded.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
