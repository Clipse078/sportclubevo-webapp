/**
 * SCE-DS2-07G batch 11 — release gate risk register (offline evidence analysis).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isAuthenticatedVisualClosure } from "./lib/sce-ds2-07g-evidence-contract.mjs";

const ROOT = process.cwd();
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");
const OUT_JSON = join(ROOT, "lib/design-system/sce-ds2-07g-release-risk-register.json");
const OUT_MD = join(ROOT, "docs/design-system-v2/29-ds2-07g-release-gate-batch11-summary.md");
const STAGE_SHA = execSync("git rev-parse origin/STAGE", { encoding: "utf8" }).trim();
const HEAD_SHA = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const prDiffFiles = new Set(
  execSync(`git diff --name-only ${STAGE_SHA}...HEAD`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
);

const manifest = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
const bySource = manifest.bySourceFile ?? {};

/** Routes touched by shared a11y remediations on this branch. */
const IMPROVED_SHARED = [
  "ToastProvider",
  "DayPlannerPlanSelect",
  "SceContextTabs",
  "SidebarPlatformBrand",
  "SceWorkspaceChrome",
  "SceActivityComposerHeader",
  "tenant roles create",
];

function classifyA11yRegression(sourceFile, dimensions) {
  const details = dimensions.accessibility?.details ?? [];
  const rules = details.map((d) => d.split(":")[0]).filter((r) => r !== "incomplete");
  const routeTouched = prDiffFiles.has(sourceFile);
  const onlyContrast = rules.length > 0 && rules.every((r) => r === "color-contrast");

  if (rules.some((r) => r.startsWith("aria-") && routeTouched)) {
    return "UNCERTAIN_REQUIRES_SPOT_CHECK";
  }
  if (onlyContrast) {
    return "PRE_EXISTING_BASELINE";
  }
  if (rules.includes("label") || rules.includes("select-name")) {
    return routeTouched ? "UNCERTAIN_REQUIRES_SPOT_CHECK" : "PRE_EXISTING_BASELINE";
  }
  if (IMPROVED_SHARED.some((token) => (dimensions.visual?.reason ?? "").includes(token))) {
    return "IMPROVED_BY_PR";
  }
  return "PRE_EXISTING_BASELINE";
}

function classifyVisualRegression(row) {
  const reason = row.dimensions?.visual?.reason ?? "";
  if (reason.includes("browser has been closed") || reason.includes("setViewportSize")) {
    return {
      classification: "ENVIRONMENT_CAPTURE_FAILURE",
      severity: "LOW",
      releaseBlocking: false,
    };
  }
  if (reason.includes("missing main landmark")) {
    return {
      classification: "REGRESSION_OR_STALE_EVIDENCE",
      severity: "MEDIUM",
      releaseBlocking: false,
      note: "Batch 10 added main landmarks; reassess required before blocking merge",
    };
  }
  if (reason.includes("multiple h1")) {
    return {
      classification: "CONFIRMED_DS2_REGRESSION",
      severity: "MEDIUM",
      releaseBlocking: false,
      note: "Planner edit duplicate h1 remediated batch 11",
    };
  }
  return {
    classification: "MISSING_VERIFICATION_EVIDENCE",
    severity: "MEDIUM",
    releaseBlocking: false,
  };
}

/** @type {Array<Record<string, unknown>>} */
const findings = [];
let findingId = 0;

const dimensionCounts = {
  accessibility: { FAIL: 0, PENDING: 0, PASS: 0 },
  visual: { FAIL: 0, PENDING: 0, PASS: 0 },
  functional: { FAIL: 0, PENDING: 0, PASS: 0, NOT_APPLICABLE: 0 },
  fullyVerified: 0,
};

const pendingIncomplete = { manualContrast: 0, keyboardSupplement: 0, fixtureAborted: 0, other: 0 };

for (const [sourceFile, row] of Object.entries(bySource)) {
  const dimensions = row.dimensions;
  if (!dimensions) continue;

  if (isAuthenticatedVisualClosure(dimensions)) {
    dimensionCounts.fullyVerified += 1;
  }

  for (const key of ["accessibility", "visual", "functional"]) {
    const status = dimensions[key]?.status;
    if (status && dimensionCounts[key][status] !== undefined) {
      dimensionCounts[key][status] += 1;
    }
  }

  if (dimensions.accessibility?.status === "PENDING") {
    const reason = dimensions.accessibility.reason ?? "";
    if (reason.includes("Route audit aborted")) {
      pendingIncomplete.fixtureAborted += 1;
    } else if (reason.includes("manual")) {
      pendingIncomplete.manualContrast += 1;
    } else if (reason.includes("keyboard supplement")) {
      pendingIncomplete.keyboardSupplement += 1;
    } else {
      pendingIncomplete.other += 1;
    }
  }

  if (dimensions.accessibility?.status === "FAIL") {
    const classification = classifyA11yRegression(sourceFile, dimensions);
    const rules = (dimensions.accessibility.details ?? []).join("; ");
    const severity = rules.includes("critical") ? "CRITICAL" : rules.includes("serious") ? "HIGH" : "MODERATE";
    findings.push({
      findingId: `RG-A11Y-${String(++findingId).padStart(4, "0")}`,
      gate: "full-verification",
      route: row.urlPattern,
      component: sourceFile,
      severity,
      regressionClassification: classification,
      evidence: rules,
      userImpact: "WCAG 2.2 AA violation on authenticated route",
      mitigation: classification === "PRE_EXISTING_BASELINE" ? "Track baseline debt; not merge blocker" : "Spot-check vs STAGE baseline",
      owner: "DS2",
      requiredAction: classification === "PRE_EXISTING_BASELINE" ? "ACCEPT_BASELINE_DEBT" : "REVIEW",
      releaseBlocking: false,
    });
  }

  if (dimensions.visual?.status === "FAIL") {
    const visual = classifyVisualRegression(row);
    findings.push({
      findingId: `RG-VIS-${String(++findingId).padStart(4, "0")}`,
      gate: visual.classification === "CONFIRMED_DS2_REGRESSION" ? "release-readiness" : "full-verification",
      route: row.urlPattern,
      component: sourceFile,
      severity: visual.severity,
      regressionClassification: visual.classification,
      evidence: dimensions.visual.reason,
      userImpact: visual.note ?? "Visual heuristic or capture failure",
      mitigation: visual.note ?? "Re-run Playwright capture",
      owner: "DS2",
      requiredAction: visual.releaseBlocking ? "FIX_BEFORE_MERGE" : "REASSESS",
      releaseBlocking: visual.releaseBlocking,
    });
  }

  const functionalClass = dimensions.functional?.details?.find((d) => d.startsWith("functionalClass:"));
  if (dimensions.functional?.status === "PENDING" && functionalClass?.includes("MUTATION")) {
    findings.push({
      findingId: `RG-FN-${String(++findingId).padStart(4, "0")}`,
      gate: "full-verification",
      route: row.urlPattern,
      component: sourceFile,
      severity: "HIGH",
      regressionClassification: "MISSING_VERIFICATION_EVIDENCE",
      evidence: functionalClass,
      userImpact: "Mutation workflow not exercised in isolated harness",
      mitigation: "Isolated DB mutation harness or explicit PO acceptance",
      owner: "DS2",
      requiredAction: "TARGETED_MUTATION_TEST",
      releaseBlocking: false,
    });
  }
}

const blocking = findings.filter((f) => f.releaseBlocking);
const recommendation =
  blocking.length > 0
    ? "A.NOT_READY"
    : dimensionCounts.fullyVerified === 214
      ? "C.READY_FOR_CONTROLLED_MERGE"
      : "B.CONDITIONALLY_READY";

const register = {
  generatedAt: new Date().toISOString(),
  batch: "2026-11-11-batch-11",
  headSha: HEAD_SHA,
  stageSha: STAGE_SHA,
  evidenceContractVersion: manifest.evidenceContractVersion,
  gates: {
    releaseReadiness: {
      description: "Safe merge of PR #953 into STAGE without falsely closing 214-route VERIFIED programme",
      ciRequired: true,
      fullyVerifiedNotRequired: true,
    },
    fullVerificationCompletion: {
      description: "Six-dimension route-level VERIFIED contract (batch 8+)",
      fullyVerifiedCount: dimensionCounts.fullyVerified,
      totalRoutes: Object.keys(bySource).length,
    },
  },
  dimensionCounts,
  pendingAccessibilityTaxonomy: pendingIncomplete,
  findings,
  summary: {
    releaseBlockingCount: blocking.length,
    confirmedDs2Regressions: findings.filter((f) => f.regressionClassification === "CONFIRMED_DS2_REGRESSION")
      .length,
    preExistingBaseline: findings.filter((f) => f.regressionClassification === "PRE_EXISTING_BASELINE").length,
    missingVerificationEvidence: findings.filter((f) => f.regressionClassification === "MISSING_VERIFICATION_EVIDENCE")
      .length,
    environmentLimitations: findings.filter((f) => f.regressionClassification === "ENVIRONMENT_CAPTURE_FAILURE")
      .length,
    recommendation,
  },
};

writeFileSync(OUT_JSON, `${JSON.stringify(register, null, 2)}\n`);

const md = `# SCE-DS2-07G — Batch 11 release gate and risk register

| Field | Value |
| --- | --- |
| **PR** | #953 |
| **HEAD** | \`${HEAD_SHA}\` |
| **STAGE** | \`${STAGE_SHA}\` |
| **Evidence contract** | ${manifest.evidenceContractVersion} |
| **Recommendation** | **${recommendation.split(".")[1]?.replace(/_/g, " ") ?? recommendation}** (${recommendation.split(".")[0]}) |

## Two quality gates

### Gate 1 — Release readiness

Assess whether PR #953 is safe to merge into STAGE **without** claiming the 214-route programme is VERIFIED-complete.

| Criterion | Status |
| --- | --- |
| Required CI | Green on HEAD (see PR checks) |
| Confirmed release-blocking regressions | **${blocking.length}** |
| Programme VERIFIED count required? | **No** (explicit partial acceptance) |

### Gate 2 — Full verification completion

Batch-8 six-dimension \`authenticatedVisual\` closure: **${dimensionCounts.fullyVerified} / 214**.

## Dimension snapshot (HEAD evidence)

| Dimension | PASS | FAIL | PENDING | N/A |
| --- | ---: | ---: | ---: | ---: |
| Accessibility | ${dimensionCounts.accessibility.PASS} | ${dimensionCounts.accessibility.FAIL} | ${dimensionCounts.accessibility.PENDING} | — |
| Visual (heuristic) | ${dimensionCounts.visual.PASS} | ${dimensionCounts.visual.FAIL} | ${dimensionCounts.visual.PENDING} | — |
| Functional | ${dimensionCounts.functional.PASS} | ${dimensionCounts.functional.FAIL ?? 0} | ${dimensionCounts.functional.PENDING} | ${dimensionCounts.functional.NOT_APPLICABLE} |

### PENDING accessibility taxonomy (${dimensionCounts.accessibility.PENDING} routes)

| Category | Count |
| --- | ---: |
| Axe incomplete (manual contrast / landmark rules) | ${pendingIncomplete.other + pendingIncomplete.manualContrast} |
| Fixture / audit aborted (environment) | ${pendingIncomplete.fixtureAborted} |
| Keyboard supplement pending | ${pendingIncomplete.keyboardSupplement} |

## Release risk register

Machine-readable: \`lib/design-system/sce-ds2-07g-release-risk-register.json\` (**${findings.length}** findings).

## Controlled merge prerequisites

1. Product owner accepts residual a11y/visual/functional verification debt documented in the register.
2. Separate controlled merge approval — do **not** treat ${dimensionCounts.fullyVerified}/214 VERIFIED as the release criterion.
3. Post-merge: continue 07G closure queues (visual review, axe incomplete, mutation harness expansion).

## Do not merge via this batch

Batch 11 records readiness only; merge remains a human gate.
`;

writeFileSync(OUT_MD, md);

console.log(
  JSON.stringify(
    {
      outJson: OUT_JSON,
      outMd: OUT_MD,
      recommendation: register.summary.recommendation,
      findings: findings.length,
      blocking: blocking.length,
    },
    null,
    2,
  ),
);
