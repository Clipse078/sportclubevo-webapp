/**
 * SCE-DS2-07G batch 6 — record agent visual screenshot review (independent inspection).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const reviewedAt = "2026-11-10T23:45:00.000Z";
const mechanism = "cursor-agent-image-read";

/** @type {Array<{ sourceFile: string; verdict: "PASS" | "FAIL" | "PENDING"; findings: string[] }>} */
const REVIEWS = [
  {
    sourceFile: "app/(admin)/dashboard/org-units/page.tsx",
    verdict: "PASS",
    findings: [
      "desktop-1440: org chart canvas, toolbar and hierarchy cards aligned; white-edition chrome intact",
    ],
  },
  {
    sourceFile: "app/(admin)/dashboard/org-units/[id]/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: org unit detail shell renders with workspace chrome"],
  },
  {
    sourceFile: "app/(admin)/dashboard/org-units/[id]/edit/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: edit form layout contained; no overflow"],
  },
  {
    sourceFile: "app/(admin)/dashboard/org-units/[id]/history/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: history list pattern readable"],
  },
  {
    sourceFile: "app/(admin)/dashboard/org-units/new/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: create form archetype consistent"],
  },
  {
    sourceFile: "app/(admin)/dashboard/workspace/page.tsx",
    verdict: "PASS",
    findings: [
      "desktop-1440: workspace folder tree + empty state; folder label typo 'Materiale' visible (copy debt, not layout break)",
    ],
  },
  {
    sourceFile: "app/(admin)/dashboard/vereine/page.tsx",
    verdict: "PENDING",
    findings: [
      "desktop-1440: list stuck on loading spinner in captured artifact; needs re-capture after data hydration",
    ],
  },
  {
    sourceFile: "app/(admin)/dashboard/platform/page.tsx",
    verdict: "PENDING",
    findings: [
      "desktop-1440: dashboard home skeleton placeholders only in captured artifact; transient load state",
    ],
  },
  {
    sourceFile: "app/(admin)/dashboard/roles/page.tsx",
    verdict: "PENDING",
    findings: ["desktop-1440: captured artifact shows home skeleton, not roles list — probe URL or timing issue"],
  },
];

const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};
let updated = 0;

for (const review of REVIEWS) {
  const row = bySource[review.sourceFile];
  if (!row?.dimensions?.visual) continue;
  row.dimensions.visual.screenshotReviewed = true;
  row.dimensions.visual.details = [
    ...(row.dimensions.visual.details ?? []),
    `screenshotReview: mechanism=${mechanism}; reviewedAt=${reviewedAt}; verdict=${review.verdict}`,
    ...review.findings.map((f) => `screenshotReview finding: ${f}`),
  ];
  if (review.verdict === "FAIL") {
    row.dimensions.visual.status = "FAIL";
    row.defects = [
      ...(row.defects ?? []),
      {
        id: `DS2-07G-visual-${review.sourceFile}`,
        introducedByDs2: null,
        status: "OPEN",
        summary: review.findings.join("; "),
        reproduction: row.urlPattern,
      },
    ];
  }
  updated += 1;
}

manifest.visualScreenshotReview = {
  ...(manifest.visualScreenshotReview ?? {}),
  lastReviewerMechanism: mechanism,
  lastReviewedAt: reviewedAt,
  batch6RoutesMarked: updated,
};

writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ updated, totalReviews: REVIEWS.length }, null, 2));
