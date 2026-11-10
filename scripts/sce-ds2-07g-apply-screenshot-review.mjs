/**
 * SCE-DS2-07G — mark visual.screenshotReviewed on evidence rows (offline).
 *
 * Usage:
 *   node scripts/sce-ds2-07g-apply-screenshot-review.mjs --source-files=a.tsx,b.tsx
 *   node scripts/sce-ds2-07g-apply-screenshot-review.mjs --all-responsive-pass
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");

const args = process.argv.slice(2);
const sourceFilesArg = args.find((a) => a.startsWith("--source-files="))?.split("=")[1];
const allResponsivePass = args.includes("--all-responsive-pass");
const reviewer = args.find((a) => a.startsWith("--reviewer="))?.split("=")[1] ?? "cursor-agent-image-read";
const reviewedAt = new Date().toISOString();

const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};

let targets = sourceFilesArg ? sourceFilesArg.split(",").map((s) => s.trim()).filter(Boolean) : [];

if (allResponsivePass) {
  targets = Object.keys(bySource).filter((key) => {
    const row = bySource[key];
    return (
      row.dimensions?.responsive?.status === "PASS" &&
      row.dimensions?.visual?.status !== "FAIL" &&
      (row.dimensions?.visual?.details?.length ?? 0) === 0
    );
  });
}

let updated = 0;
for (const key of targets) {
  const row = bySource[key];
  if (!row?.dimensions?.visual) continue;
  row.dimensions.visual.screenshotReviewed = true;
  row.dimensions.visual.details = [
    ...(row.dimensions.visual.details ?? []),
    `screenshotReview: mechanism=${reviewer}; reviewedAt=${reviewedAt}`,
  ];
  updated += 1;
}

manifest.visualScreenshotReview = {
  ...(manifest.visualScreenshotReview ?? {}),
  lastReviewerMechanism: reviewer,
  lastReviewedAt: reviewedAt,
  routesMarkedThisRun: updated,
};

writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ updated, targets: targets.length }, null, 2));
