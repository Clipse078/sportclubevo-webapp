/**
 * SCE-DS2-07G batch 8 — screenshot artifact completeness heuristics (offline).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};

const VIEWPORTS = ["desktop", "compactDesktop", "tablet", "mobile"];
let missingFiles = 0;
let completeRows = 0;

for (const row of Object.values(bySource)) {
  const refs = row.evidenceReferences ?? [];
  const perViewport = VIEWPORTS.every((vp) =>
    refs.some((ref) => ref.includes(`-${vp}.png`) && existsSync(ref)),
  );
  if (perViewport) completeRows += 1;
  for (const ref of refs) {
    if (!existsSync(ref)) missingFiles += 1;
  }
}

const result = {
  checkedAt: new Date().toISOString(),
  evidenceRows: Object.keys(bySource).length,
  rowsWithFourViewportsOnDisk: completeRows,
  missingArtifactFiles: missingFiles,
};

console.log(JSON.stringify(result, null, 2));
