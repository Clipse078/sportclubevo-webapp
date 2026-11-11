/**
 * SCE-DS2-07G batch 7 — agent visual screenshot review (high-risk + shared chrome routes).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const reviewedAt = new Date().toISOString();
const mechanism = "cursor-agent-image-read-batch7";

/** @type {Array<{ sourceFile: string; verdict: "PASS" | "FAIL" | "PENDING"; findings: string[] }>} */
const REVIEWS = [
  {
    sourceFile: "app/(admin)/dashboard/finance/reports/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: P&L reporting workspace loaded; tabs and investigation panel aligned"],
  },
  {
    sourceFile: "app/(admin)/dashboard/planner/day/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: day planner grid and plan selector render without layout break"],
  },
  {
    sourceFile: "app/(admin)/dashboard/training/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: training list workspace with white-edition chrome"],
  },
  {
    sourceFile: "app/(admin)/dashboard/notifications/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: notification center filters and empty-state readable"],
  },
  {
    sourceFile: "app/(admin)/dashboard/website/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: CMS hub cards and navigation intact"],
  },
  {
    sourceFile: "app/(admin)/dashboard/matchcenter/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: matchcenter operational shell; no error interstitial in capture"],
  },
  {
    sourceFile: "app/(admin)/dashboard/administration/roles/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: roles list workspace consistent with batch-6 review"],
  },
  {
    sourceFile: "app/(admin)/dashboard/administration/roles/[id]/page.tsx",
    verdict: "PASS",
    findings: ["desktop-1440: role detail tabs and permission matrix visible"],
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
    ...(row.dimensions.visual.details ?? []).filter((d) => !d.startsWith("screenshotReview:")),
    `screenshotReview: mechanism=${mechanism}; reviewedAt=${reviewedAt}; verdict=${review.verdict}`,
    ...review.findings.map((f) => `finding: ${f}`),
  ];
  if (review.verdict === "PASS" && row.dimensions.visual.status !== "FAIL") {
    row.dimensions.visual.status = "PASS";
    row.dimensions.visual.reason = "Agent desktop screenshot review PASS (batch 7)";
  } else if (review.verdict === "PENDING") {
    row.dimensions.visual.status = "PENDING";
    row.dimensions.visual.reason = "Agent review inconclusive; capture or hydration follow-up required";
  }
  updated += 1;
}

manifest.visualScreenshotReview = {
  ...(manifest.visualScreenshotReview ?? {}),
  lastReviewerMechanism: mechanism,
  lastReviewedAt: reviewedAt,
  batch7RoutesMarked: updated,
};

writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ updated, mechanism, reviewedAt }, null, 2));
