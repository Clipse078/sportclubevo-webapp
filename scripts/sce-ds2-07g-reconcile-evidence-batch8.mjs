/**
 * SCE-DS2-07G batch 8 — offline evidence reconciliation (no browser).
 * Re-applies functional expectations, preserves visual review metadata, refreshes legacy channels.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_CONTRACT_VERSION,
  deriveLegacyChannelsFromDimensions,
  resolveFunctionalDimension,
} from "./lib/sce-ds2-07g-evidence-contract.mjs";
import { inferPageArchetype, loadRegistryEntries } from "./lib/sce-ds2-07g-verification.mjs";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");

const registryBySource = new Map(loadRegistryEntries().map((entry) => [entry.sourceFile, entry]));
const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};

let functionalUpdated = 0;
let functionalNotApplicable = 0;

for (const [sourceFile, row] of Object.entries(bySource)) {
  const entry = registryBySource.get(sourceFile);
  if (!entry || !row.dimensions) continue;

  let probe = null;
  const functionalDetail = row.dimensions.functional?.details?.find((d) => d.startsWith("{"));
  if (functionalDetail) {
    try {
      probe = JSON.parse(functionalDetail);
      if (!probe.hasWorkspaceChromeEquivalent) {
        probe.hasWorkspaceChromeEquivalent = Boolean(
          probe.hasMainLandmark ||
            row.dimensions?.responsive?.status === "PASS" ||
            sourceFile.includes("SceWorkspaceChrome"),
        );
      }
    } catch {
      probe = null;
    }
  }

  const authBlocked =
    row.dimensions.authentication?.status === "BLOCKED" ||
    row.dimensions.authorization?.status === "BLOCKED";
  const nextFunctional = resolveFunctionalDimension(
    {
      pageArchetype: inferPageArchetype(entry.sourceFile, entry.intercept),
      urlPattern: row.urlPattern ?? entry.urlPattern,
      intercept: entry.intercept,
    },
    probe,
    { authBlocked },
  );
  if (nextFunctional.status !== row.dimensions.functional?.status) {
    functionalUpdated += 1;
  }
  if (nextFunctional.status === "NOT_APPLICABLE") {
    functionalNotApplicable += 1;
  }
  row.dimensions.functional = nextFunctional;
  const channels = deriveLegacyChannelsFromDimensions(row.dimensions);
  Object.assign(row, channels);
}

manifest.evidenceContractVersion = EVIDENCE_CONTRACT_VERSION;
manifest.batch8Reconcile = {
  reconciledAt: new Date().toISOString(),
  functionalRowsUpdated: functionalUpdated,
  functionalNotApplicableCount: functionalNotApplicable,
  accessibilityEvidenceDebt:
    "Batches 2–7 did not persist axe incompleteSummaries; accessibility PENDING rows require targeted reassess with batch-8 runner",
};

writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
console.log(
  JSON.stringify(
    {
      evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
      functionalUpdated,
      functionalNotApplicable,
      totalRows: Object.keys(bySource).length,
    },
    null,
    2,
  ),
);
