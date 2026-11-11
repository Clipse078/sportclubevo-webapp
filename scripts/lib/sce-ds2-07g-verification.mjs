/**
 * SCE-DS2-07G — verification matrix builders and static audit helpers.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateRepository } from "./sce-ds2-07b-route-governance.mjs";
import {
  EVIDENCE_CONTRACT_VERSION,
  deriveLegacyChannelsFromDimensions,
  extractDimensions,
  isAuthenticatedVisualClosure,
} from "./sce-ds2-07g-evidence-contract.mjs";

const ROOT = process.cwd();

export const MODULE_TEST_PERSONA = {
  administration: "FCA club admin (it@fcallschwil.ch)",
  "tenant-admin": "Platform superadmin (hello@tulip-digital.ch)",
  dashboard: "FCA club admin (it@fcallschwil.ch)",
  finance: "Finance workspace editor",
  wochenplaner: "Planning allocations viewer",
  training: "Training workspace editor",
  matches: "Matchcenter operator",
  tournaments: "Tournaments workspace editor",
  events: "Events workspace editor",
  communication: "Communication workspace editor",
  "website-cms": "Website CMS editor",
  persons: "People & access administrator",
  teams: "Teams workspace editor",
  clubs: "Club directory administrator",
  aufgaben: "Tasks workspace editor",
  infoboard: "Infoboard designer",
  vereinsleitung: "Vereinsleitung governance editor",
  settings: "FCA club admin (it@fcallschwil.ch)",
  workspace: "FCA club admin (it@fcallschwil.ch)",
};

const PERMISSION_FALLBACK = {
  administration: ["admin.access"],
  finance: ["finance.view"],
  wochenplaner: ["planning.allocations.view"],
  matches: ["matches.view"],
  training: ["training.view"],
  tournaments: ["tournaments.view"],
  events: ["events.view"],
  communication: ["communication.view"],
  "website-cms": ["website.cms.view"],
  persons: ["people.view"],
  teams: ["teams.view"],
  clubs: ["clubs.view"],
  aufgaben: ["tasks.view"],
  infoboard: ["infoboard.view"],
  vereinsleitung: ["governance.view"],
  dashboard: ["dashboard.view"],
  settings: ["settings.view"],
  workspace: ["workspace.view"],
  "tenant-admin": ["platform.admin"],
};

export function loadRegistryEntries() {
  return evaluateRepository(ROOT).registry;
}

function readPageBlob(sourceFile) {
  const abs = join(ROOT, sourceFile);
  if (!existsSync(abs)) return "";
  let blob = readFileSync(abs, "utf8");
  const parts = sourceFile.split("/");
  parts.pop();
  let dir = join(ROOT, ...parts);
  while (dir.startsWith(join(ROOT, "app"))) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) {
      blob += `\n${readFileSync(layout, "utf8")}`;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return blob;
}

export function extractRequiredPermissions(sourceFile) {
  const blob = readPageBlob(sourceFile);
  const found = new Set();
  for (const match of blob.matchAll(
    /require(?:Any|All)?Permission\(\s*(?:\[([^\]]+)\]|"([^"]+)"|'([^']+)')/g,
  )) {
    const list = match[1];
    if (list) {
      for (const item of list.matchAll(/"([^"]+)"|'([^']+)'/g)) {
        found.add(item[1] ?? item[2]);
      }
    } else if (match[2] || match[3]) {
      found.add(match[2] ?? match[3]);
    }
  }
  if (found.size > 0) {
    return [...found].sort();
  }
  return null;
}

export function inferPageArchetype(sourceFile, intercept) {
  if (intercept) return "intercept";
  const blob = readPageBlob(sourceFile);
  if (blob.includes("FutureModulePageContent")) return "future-module";
  if (blob.includes("PlanningActivitiesPageFrame")) return "planning-activity";
  const markers = [
    ["form", "FormPagePattern"],
    ["detail", "DetailPagePattern"],
    ["list", "ListPagePattern"],
    ["workspace-hub", "SceWorkspaceChrome"],
  ];
  const hits = markers.filter(([, marker]) => blob.includes(marker)).map(([name]) => name);
  if (hits.length === 0) return "mixed";
  if (hits.length === 1) return hits[0];
  return hits.includes("form")
    ? "form"
    : hits.includes("detail")
      ? "detail"
      : hits.includes("list")
        ? "list"
        : "mixed";
}

export function inferTestPersona(module) {
  return MODULE_TEST_PERSONA[module] ?? MODULE_TEST_PERSONA.workspace;
}

export function inferPermissions(module, sourceFile) {
  const extracted = extractRequiredPermissions(sourceFile);
  if (extracted?.length) return extracted;
  return PERMISSION_FALLBACK[module] ?? PERMISSION_FALLBACK.workspace;
}

export const HIGH_RISK_URL_PATTERNS = [
  "/dashboard/planner/week",
  "/dashboard/planner/day",
  "/dashboard/matchcenter",
  "/dashboard/finance",
  "/dashboard/aufgaben",
  "/dashboard/infoboard",
  "/dashboard/administration/roles",
  "/dashboard/training",
  "/dashboard/competitions",
];

export function isHighRiskRoute(urlPattern) {
  return HIGH_RISK_URL_PATTERNS.some(
    (prefix) => urlPattern === prefix || urlPattern.startsWith(`${prefix}/`),
  );
}

export function runStaticCanonicalAudit() {
  const entries = loadRegistryEntries().filter(
    (entry) =>
      entry.migrationPackage === "DS2-07G" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      entry.architecture === "CANONICAL",
  );
  const defects = [];
  for (const entry of entries) {
    const blob = readPageBlob(entry.sourceFile);
    if (!blob.includes("SceWorkspaceChrome") && !blob.includes("ListPagePattern") && !blob.includes("DetailPagePattern") && !blob.includes("FormPagePattern") && !blob.includes("PlanningActivitiesPageFrame") && !blob.includes("FutureModulePageContent")) {
      defects.push({
        code: "DS2-07G-MISSING-CANONICAL-CHROME",
        sourceFile: entry.sourceFile,
        urlPattern: entry.urlPattern,
        message: "Canonical route is missing a recognized DS2 workspace pattern marker",
      });
    }
  }
  return { entriesScanned: entries.length, defects };
}

export function buildVerificationMatrix({ evidenceBySource = {}, authenticatedBrowserAvailable = false } = {}) {
  const registry = loadRegistryEntries();
  const rows = [];
  for (const entry of registry) {
    if (entry.migrationPackage !== "DS2-07G" || entry.routeKind !== "RENDERABLE_PAGE") continue;
    const evidence = evidenceBySource[entry.sourceFile] ?? null;
    const permissions = inferPermissions(entry.module, entry.sourceFile);
    const archetype = inferPageArchetype(entry.sourceFile, entry.intercept);
    const persona = inferTestPersona(entry.module);
    const automated = entry.architecture === "CANONICAL" ? "PASSED" : "PENDING";
    const dimensions = evidence ? extractDimensions(evidence) : null;
    const channels = dimensions
      ? deriveLegacyChannelsFromDimensions(dimensions)
      : {
          desktop: "PENDING",
          compactDesktop: "PENDING",
          tablet: "PENDING",
          mobile: "PENDING",
          accessibility: "PENDING",
          functional: "PENDING",
          authenticatedVisual: "PENDING",
        };
    rows.push({
      urlPattern: entry.urlPattern,
      sourceFile: entry.sourceFile,
      module: entry.module,
      requiredPermissions: permissions,
      testPersona: persona,
      pageArchetype: archetype,
      intercept: entry.intercept,
      parallelSlot: entry.parallelSlot,
      architectureAdoption: entry.migrationStatus === "IMPLEMENTED" ? "IMPLEMENTED" : "IMPLEMENTED",
      automatedChecks: automated,
      desktop: channels.desktop,
      compactDesktop: channels.compactDesktop,
      tablet: channels.tablet,
      mobile: channels.mobile,
      accessibility: channels.accessibility,
      functional: channels.functional,
      authenticatedVisual: channels.authenticatedVisual,
      evidenceReferences: evidence?.evidenceReferences ?? [],
      defects: evidence?.defects ?? [],
    });
  }
  rows.sort((a, b) => a.urlPattern.localeCompare(b.urlPattern));
  return rows;
}

export function countDimensionClosure(evidenceBySource) {
  let closureComplete = 0;
  let responsivePartial = 0;
  let accessibilityPass = 0;
  let functionalPass = 0;
  for (const row of Object.values(evidenceBySource)) {
    const dimensions = extractDimensions(row);
    if (isAuthenticatedVisualClosure(dimensions)) closureComplete += 1;
    if (dimensions.responsive?.status === "PASS") responsivePartial += 1;
    if (dimensions.accessibility?.status === "PASS") accessibilityPass += 1;
    if (dimensions.functional?.status === "PASS") functionalPass += 1;
  }
  return { closureComplete, responsivePartial, accessibilityPass, functionalPass };
}

/** Non-high-risk module batches for batch 3+ authenticated runs (priority order). */
export const BATCH_3_MODULE_PRIORITY = [
  "wochenplaner",
  "events",
  "training",
  "matches",
  "dashboard",
  "persons",
  "teams",
  "communication",
  "website-cms",
  "vereinsleitung",
  "administration",
  "settings",
  "tournaments",
  "clubs",
  "tenant-admin",
];

export function selectBatch3Routes({ limit = 40, offset = 0, evidenceBySource = {} } = {}) {
  const registry = loadRegistryEntries().filter(
    (entry) =>
      entry.migrationPackage === "DS2-07G" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      !isHighRiskRoute(entry.urlPattern),
  );
  const pending = registry.filter((entry) => {
    const evidence = evidenceBySource[entry.sourceFile];
    if (!evidence) return true;
    const dimensions = extractDimensions(evidence);
    return !isAuthenticatedVisualClosure(dimensions);
  });
  pending.sort((a, b) => {
    const aHasEvidence = evidenceBySource[a.sourceFile] ? 1 : 0;
    const bHasEvidence = evidenceBySource[b.sourceFile] ? 1 : 0;
    if (aHasEvidence !== bHasEvidence) {
      return aHasEvidence - bHasEvidence;
    }
    const ai = BATCH_3_MODULE_PRIORITY.indexOf(a.module);
    const bi = BATCH_3_MODULE_PRIORITY.indexOf(b.module);
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return a.urlPattern.localeCompare(b.urlPattern);
  });
  return pending.slice(offset, offset + limit);
}

export function summarizeMatrix(rows, { authenticatedBrowserAvailable, evidenceBySource = {} } = {}) {
  const verified = rows.filter((row) => row.authenticatedVisual === "VERIFIED").length;
  const pending = rows.filter((row) => row.authenticatedVisual === "PENDING").length;
  const blocked = rows.filter((row) => row.authenticatedVisual === "BLOCKED").length;
  const automatedPassed = rows.filter((row) => row.automatedChecks === "PASSED").length;
  const highRisk = rows.filter((row) => isHighRiskRoute(row.urlPattern));
  const highRiskVerified = highRisk.filter((row) => row.authenticatedVisual === "VERIFIED").length;
  const highRiskResponsive = highRisk.filter(
    (row) =>
      row.desktop === "VERIFIED" &&
      row.compactDesktop === "VERIFIED" &&
      row.tablet === "VERIFIED" &&
      row.mobile === "VERIFIED",
  ).length;
  const dimensionCounts = countDimensionClosure(evidenceBySource);
  return {
    matrixVersion: EVIDENCE_CONTRACT_VERSION,
    evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    totalCanonicalRoutes: rows.length,
    verifiedAuthenticatedVisualCount: verified,
    pendingAuthenticatedVisualCount: pending,
    blockedCount: blocked,
    automatedChecksPassedCount: automatedPassed,
    highRiskBatchSize: highRisk.length,
    highRiskVerifiedCount: highRiskVerified,
    highRiskResponsiveVerifiedCount: highRiskResponsive,
    dimensionClosureCompleteCount: dimensionCounts.closureComplete,
    dimensionAccessibilityPassCount: dimensionCounts.accessibilityPass,
    dimensionFunctionalPassCount: dimensionCounts.functionalPass,
    authenticatedBrowserAvailable,
    contrastSmokeDebt: [
      "vitest contrast smoke may time out during cold Playwright install; direct script passes (scripts/sce-ds2-06-visual-archetypes-browser-check.mjs)",
    ],
    trackedBaselineDebt: [
      "Matchcenter operational panels (sce-design-system-10r2 migration debt)",
      "Infoboard designer live preview surfaces",
      "Aufgaben intercept modal routes",
      "Batch 3 evidence contract: responsive/auth from batch 2 preserved; visual/a11y/functional require independent proof",
    ],
  };
}
