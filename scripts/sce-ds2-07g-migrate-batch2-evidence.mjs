/**
 * SCE-DS2-07G — attach batch-3 dimension evidence to existing manifest rows (no browser).
 * Run: node scripts/sce-ds2-07g-migrate-batch2-evidence.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_CONTRACT_VERSION,
  deriveLegacyChannelsFromDimensions,
  extractDimensions,
  migrateLegacyEvidenceRow,
} from "./lib/sce-ds2-07g-evidence-contract.mjs";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");

const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
manifest.evidenceContractVersion = EVIDENCE_CONTRACT_VERSION;
manifest.batch = manifest.batch?.includes("batch-3")
  ? manifest.batch
  : `${manifest.batch ?? "high-risk-batch-2"}+batch-3-dimension-migration`;

let migrated = 0;
for (const [sourceFile, row] of Object.entries(manifest.bySourceFile ?? {})) {
  if (row.dimensions) {
    migrated += 1;
    continue;
  }
  row.dimensions = row.dimensions ?? migrateLegacyEvidenceRow(row);
  const channels = deriveLegacyChannelsFromDimensions(extractDimensions(row));
  Object.assign(row, channels);
  row.blocked = channels.authenticatedVisual === "BLOCKED";
  migrated += 1;
}

manifest.highRiskRoutesResponsiveVerified = Object.values(manifest.bySourceFile).filter(
  (row) =>
    row.desktop === "VERIFIED" &&
    row.compactDesktop === "VERIFIED" &&
    row.tablet === "VERIFIED" &&
    row.mobile === "VERIFIED",
).length;

manifest.highRiskRoutesClosureComplete = Object.values(manifest.bySourceFile).filter((row) => {
  const dimensions = extractDimensions(row);
  return dimensions.accessibility?.status === "PASS" && dimensions.functional?.status === "PASS";
}).length;

writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
console.log(
  `[sce-ds2-07g] migrated dimension evidence for ${migrated} routes; responsive verified=${manifest.highRiskRoutesResponsiveVerified}`,
);
