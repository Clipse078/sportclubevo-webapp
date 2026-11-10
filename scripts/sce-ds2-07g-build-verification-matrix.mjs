/**
 * SCE-DS2-07G — generate the committed verification matrix artifact.
 * Run: node scripts/sce-ds2-07g-build-verification-matrix.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVerificationMatrix,
  runStaticCanonicalAudit,
  summarizeMatrix,
} from "./lib/sce-ds2-07g-verification.mjs";

const ROOT = process.cwd();
const EVIDENCE_MANIFEST = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const OUT_TS = join(ROOT, "lib/design-system/sce-ds2-07g-verification-matrix.ts");

function loadEvidenceBySource() {
  try {
    const manifest = JSON.parse(readFileSync(EVIDENCE_MANIFEST, "utf8"));
    return manifest.bySourceFile ?? {};
  } catch {
    return {};
  }
}

const staticAudit = runStaticCanonicalAudit();
if (staticAudit.defects.length > 0) {
  console.error(
    `[sce-ds2-07g] static canonical audit found ${staticAudit.defects.length} defect(s); matrix still generated`,
  );
  for (const defect of staticAudit.defects.slice(0, 10)) {
    console.error(`  ${defect.code} ${defect.urlPattern} (${defect.sourceFile})`);
  }
}

const evidenceBySource = loadEvidenceBySource();
const authenticatedBrowserAvailable = Boolean(
  process.env.SCE_DS2_07G_LOGIN_EMAIL?.trim() && process.env.SCE_DS2_07G_LOGIN_PASSWORD?.trim(),
);
const rows = buildVerificationMatrix({ evidenceBySource, authenticatedBrowserAvailable });
const summary = summarizeMatrix(rows, { authenticatedBrowserAvailable });

mkdirSync(join(ROOT, "lib/design-system"), { recursive: true });

const ts = `/**
 * SCE-DS2-07G — verification matrix (generated; do not hand-edit).
 * Regenerate: node scripts/sce-ds2-07g-build-verification-matrix.mjs
 */
import type {
  SceDs207gVerificationMatrixEntry,
  SceDs207gVerificationSummary,
} from "./sce-ds2-07g-meta";

export const SCE_DS2_07G_VERIFICATION_MATRIX: SceDs207gVerificationMatrixEntry[] = ${JSON.stringify(rows, null, 2)};

export const SCE_DS2_07G_VERIFICATION_SUMMARY: SceDs207gVerificationSummary = ${JSON.stringify(summary, null, 2)};

export const SCE_DS2_07G_STATIC_AUDIT = ${JSON.stringify(staticAudit, null, 2)};
`;

writeFileSync(OUT_TS, ts, "utf8");
console.log(
  `[sce-ds2-07g] matrix rows=${rows.length} verified=${summary.verifiedAuthenticatedVisualCount} pending=${summary.pendingAuthenticatedVisualCount} automatedPassed=${summary.automatedChecksPassedCount}`,
);
