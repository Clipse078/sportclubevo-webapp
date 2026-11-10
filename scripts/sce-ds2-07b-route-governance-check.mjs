/**
 * SCE-DS2-07B — fail on new route-governance violations.
 * Existing legacy debt is tracked and does not fail this check.
 * Run: node scripts/sce-ds2-07b-route-governance-check.mjs
 */
import { evaluateRepository } from "./lib/sce-ds2-07b-route-governance.mjs";

const result = evaluateRepository(process.cwd());
const { summary } = result;

console.log(
  [
    `pages=${summary.pageCount}`,
    `authenticatedRenderable=${summary.authenticatedRenderableCount}`,
    `authenticatedVisual=${summary.authenticatedVisualCount}`,
    `redirects=${summary.authenticatedRedirectCount + summary.publicRedirectCount}`,
    `publicRenderable=${summary.publicRenderableCount}`,
    `canonical=${summary.architecture.CANONICAL}`,
    `partial=${summary.architecture.PARTIAL}`,
    `legacy=${summary.architecture.LEGACY}`,
    `verified=${summary.verifiedAuthenticatedVisualCount}/${summary.authenticatedVisualCount}`,
    `verifiedPercent=${summary.verifiedAuthenticatedVisualPercent}`,
    `canonicalPercent=${summary.architecturalCanonicalPercent}`,
    `unassigned=${summary.unassignedCount}`,
    `introduced=${summary.introducedAfterBaselineCount}`,
    `blocking=${summary.blockingCount}`,
    `trackedDebt=${summary.trackedDebtCount}`,
  ].join(" "),
);

if (result.drift.length > 0) {
  console.error(`DS2-07B registry drift: ${result.drift.join(", ")}`);
  console.error("Regenerate with: node scripts/sce-ds2-06-route-inventory-scan.mjs");
  process.exit(1);
}

if (result.evaluation.blocking.length > 0) {
  for (const item of result.evaluation.blocking) {
    console.error(`${item.code} ${item.sourceFile ?? ""} ${item.message}`.trim());
  }
  process.exit(1);
}
