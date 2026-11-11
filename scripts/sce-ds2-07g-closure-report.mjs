/**
 * SCE-DS2-07G batch 8 — evidence-based closure queue grouped by root cause.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  deriveLegacyChannelsFromDimensions,
  isAuthenticatedVisualClosure,
} from "./lib/sce-ds2-07g-evidence-contract.mjs";
import { inferPageArchetype, loadRegistryEntries } from "./lib/sce-ds2-07g-verification.mjs";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const OUT_JSON = "/opt/cursor/artifacts/sce-ds2-07g-closure-report.json";
const OUT_MD = join(ROOT, "docs/design-system-v2/28-ds2-07g-closure-queue-batch8.md");

const registryBySource = new Map(loadRegistryEntries().map((entry) => [entry.sourceFile, entry]));
const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};

/** @type {Record<string, { count: number, routes: string[] }>} */
const queues = {
  FULLY_VERIFIED: { count: 0, routes: [] },
  FIXTURE_ENVIRONMENT: { count: 0, routes: [] },
  ACCESSIBILITY_AXE_FAIL: { count: 0, routes: [] },
  ACCESSIBILITY_AXE_INCOMPLETE: { count: 0, routes: [] },
  ACCESSIBILITY_FIXTURE_UNPROBED: { count: 0, routes: [] },
  VISUAL_REVIEW_REQUIRED: { count: 0, routes: [] },
  VISUAL_HEURISTIC_FAIL: { count: 0, routes: [] },
  FUNCTIONAL_MUTATION_WORKFLOW: { count: 0, routes: [] },
  FUNCTIONAL_READ_ONLY_GAP: { count: 0, routes: [] },
  RESPONSIVE_FAIL: { count: 0, routes: [] },
  CONFIRMED_PRODUCT_DEFECT: { count: 0, routes: [] },
};

let fullyVerified = 0;

for (const [sourceFile, row] of Object.entries(bySource)) {
  const entry = registryBySource.get(sourceFile);
  const urlPattern = row.urlPattern ?? entry?.urlPattern ?? sourceFile;
  const dimensions = row.dimensions;
  if (!dimensions) continue;

  if (isAuthenticatedVisualClosure(dimensions)) {
    fullyVerified += 1;
    queues.FULLY_VERIFIED.routes.push(urlPattern);
    continue;
  }

  const fixtureGap =
    dimensions.authorization?.reason?.includes("fixture") ||
    dimensions.functional?.reason?.includes("missing fixture") ||
    dimensions.responsive?.reason?.includes("fixture");
  if (fixtureGap) {
    queues.FIXTURE_ENVIRONMENT.routes.push(urlPattern);
    continue;
  }

  if (dimensions.accessibility?.status === "FAIL") {
    queues.ACCESSIBILITY_AXE_FAIL.routes.push(urlPattern);
  } else if (dimensions.accessibility?.status === "PENDING" && (dimensions.accessibility?.axeIncomplete ?? 0) > 0) {
    queues.ACCESSIBILITY_AXE_INCOMPLETE.routes.push(urlPattern);
  } else if (dimensions.accessibility?.status === "PENDING") {
    queues.ACCESSIBILITY_FIXTURE_UNPROBED.routes.push(urlPattern);
  }

  if (dimensions.visual?.status === "FAIL") {
    queues.VISUAL_HEURISTIC_FAIL.routes.push(urlPattern);
  } else if (dimensions.visual?.screenshotReviewed !== true) {
    queues.VISUAL_REVIEW_REQUIRED.routes.push(urlPattern);
  }

  const functionalClass = dimensions.functional?.details?.find((d) => d.startsWith("functionalClass:"));
  if (dimensions.functional?.status === "PENDING" && functionalClass?.includes("MUTATION")) {
    queues.FUNCTIONAL_MUTATION_WORKFLOW.routes.push(urlPattern);
  } else if (dimensions.functional?.status === "PENDING") {
    queues.FUNCTIONAL_READ_ONLY_GAP.routes.push(urlPattern);
  }

  if (dimensions.responsive?.status === "FAIL") {
    queues.RESPONSIVE_FAIL.routes.push(urlPattern);
  }

  for (const defect of row.defects ?? []) {
    if (defect.status === "OPEN" && defect.summary?.includes("fixture") === false) {
      queues.CONFIRMED_PRODUCT_DEFECT.routes.push(urlPattern);
      break;
    }
  }
}

for (const bucket of Object.values(queues)) {
  bucket.count = bucket.routes.length;
  bucket.routes.sort();
}

const report = {
  generatedAt: new Date().toISOString(),
  evidenceContractVersion: manifest.evidenceContractVersion,
  fullyVerifiedCount: fullyVerified,
  totalRoutes: Object.keys(bySource).length,
  queues,
  recommendedClosureSequence: [
    "FIXTURE_ENVIRONMENT — disposable verification DB + tenant-scoped seeds (11 routes)",
    "ACCESSIBILITY_AXE_FAIL — shared token/label fixes then targeted reassess (66 routes)",
    "ACCESSIBILITY_AXE_INCOMPLETE — manual contrast review + keyboard supplement recording",
    "VISUAL_REVIEW_REQUIRED — agent screenshot review per viewport archetype",
    "FUNCTIONAL_MUTATION_WORKFLOW — isolated DB mutation harness or explicit baseline debt",
    "FULLY_VERIFIED — only when all six dimensions PASS with screenshotReviewed",
  ],
};

writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

const md = `# SCE-DS2-07G — Batch 8 closure queue

| Metric | Value |
| --- | ---: |
| Fully VERIFIED | ${fullyVerified} / ${Object.keys(bySource).length} |
| Evidence contract | ${manifest.evidenceContractVersion ?? "unknown"} |

## Queue by root cause

${Object.entries(queues)
  .map(([key, bucket]) => `### ${key}\n\n- **Count:** ${bucket.count}\n`)
  .join("\n")}

## Recommended closure sequence

${report.recommendedClosureSequence.map((line, index) => `${index + 1}. ${line}`).join("\n")}
`;

writeFileSync(OUT_MD, md, "utf8");
console.log(JSON.stringify({ fullyVerified, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
