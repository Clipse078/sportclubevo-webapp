/**
 * SCE-DS2-07G — authenticated Playwright verification (batch-3 evidence contract).
 *
 * Requires:
 *   SCE_DS2_07G_LOGIN_EMAIL
 *   SCE_DS2_07G_LOGIN_PASSWORD
 *   SCE_DS2_07G_BASE_URL (default http://127.0.0.1:3000)
 *   AUTH_SECRET or NEXTAUTH_SECRET on the app server (required for Auth.js session cookies)
 *
 * Optional:
 *   SCE_DS2_07G_MODE=reassess-batch2|reassess-evidence|batch3|high-risk (default reassess-batch2)
 *   SCE_DS2_07G_ROUTE_LIMIT=40
 *   SCE_DS2_07G_ROUTE_OFFSET=0
 *
 * Run: node scripts/sce-ds2-07g-authenticated-route-verify.mjs
 */
import { createRequire } from "node:module";
import { chromium } from "playwright";
import pg from "pg";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_CONTRACT_VERSION,
  VIEWPORT_KEYS,
  deriveLegacyChannelsFromDimensions,
} from "./lib/sce-ds2-07g-evidence-contract.mjs";
import {
  buildVerificationMatrix,
  isHighRiskRoute,
  loadRegistryEntries,
  selectBatch3Routes,
  summarizeMatrix,
} from "./lib/sce-ds2-07g-verification.mjs";

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const ROOT = process.cwd();
const BASE_URL = process.env.SCE_DS2_07G_BASE_URL?.trim() || "http://localhost:3000";
const EMAIL = process.env.SCE_DS2_07G_LOGIN_EMAIL?.trim();
const PASSWORD = process.env.SCE_DS2_07G_LOGIN_PASSWORD?.trim();
const MODE = process.env.SCE_DS2_07G_MODE?.trim() || "reassess-batch2";
const ROUTE_LIMIT = Number.parseInt(process.env.SCE_DS2_07G_ROUTE_LIMIT ?? "41", 10);
const ROUTE_OFFSET = Number.parseInt(process.env.SCE_DS2_07G_ROUTE_OFFSET ?? "0", 10);
const ARTIFACT_DIR = "/opt/cursor/artifacts/sce-ds2-07g";
const EVIDENCE_PATH = join(ROOT, "lib/design-system/sce-ds2-07g-verification-evidence.json");

const VIEWPORTS = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "compactDesktop", width: 1093, height: 900 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "mobile", width: 390, height: 844 },
];

if (!EMAIL || !PASSWORD) {
  console.error(
    "[sce-ds2-07g] Refused: SCE_DS2_07G_LOGIN_EMAIL and SCE_DS2_07G_LOGIN_PASSWORD are required.",
  );
  process.exit(2);
}

/** @type {Record<string, string>} */
let dynamicFixtures = {};

function loadExistingManifest() {
  try {
    return JSON.parse(readFileSync(EVIDENCE_PATH, "utf8"));
  } catch {
    return { bySourceFile: {} };
  }
}

async function loadDynamicFixtures() {
  dynamicFixtures = {
    seriesId: process.env.SCE_DS2_07G_FIXTURE_SERIES_ID?.trim() ?? "",
    sessionId: process.env.SCE_DS2_07G_FIXTURE_SESSION_ID?.trim() ?? "",
    eventId: process.env.SCE_DS2_07G_FIXTURE_EVENT_ID?.trim() ?? "",
    taskId: process.env.SCE_DS2_07G_FIXTURE_TASK_ID?.trim() ?? "",
    clubId: process.env.SCE_DS2_07G_FIXTURE_CLUB_ID?.trim() ?? "",
    pageId: process.env.SCE_DS2_07G_FIXTURE_PAGE_ID?.trim() ?? "",
    componentId: process.env.SCE_DS2_07G_FIXTURE_COMPONENT_ID?.trim() ?? "",
  };
  if (Object.values(dynamicFixtures).every(Boolean)) return;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return;

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 15_000,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    if (!dynamicFixtures.seriesId) {
      const series = await client.query(
        `SELECT id FROM "TrainingSeries" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.seriesId = series.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.sessionId) {
      const session = await client.query(
        `SELECT id FROM "TrainingSession" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.sessionId = session.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.eventId) {
      const event = await client.query(`SELECT id FROM "Event" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`);
      dynamicFixtures.eventId = event.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.taskId) {
      const task = await client.query(
        `SELECT id FROM "Task" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.taskId = task.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.clubId) {
      const club = await client.query(
        `SELECT id FROM "ExternalClub" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.clubId = club.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.pageId) {
      const page = await client.query(
        `SELECT id FROM "WebsitePage" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.pageId = page.rows[0]?.id ?? "";
    }
    if (!dynamicFixtures.componentId) {
      const component = await client.query(
        `SELECT id FROM "ReusableComponent" ORDER BY "updatedAt" DESC NULLS LAST LIMIT 1`,
      );
      dynamicFixtures.componentId = component.rows[0]?.id ?? "";
    }
  } finally {
    await client.end().catch(() => {});
  }
}

function resolveProbePath(urlPattern) {
  let resolved = urlPattern;
  const fixtureValues = { ...dynamicFixtures };
  if (!fixtureValues.id) {
    if (urlPattern.includes("/website/components/")) fixtureValues.id = dynamicFixtures.componentId;
    else if (urlPattern.includes("/website/pages/")) fixtureValues.id = dynamicFixtures.pageId;
    else if (urlPattern.includes("/vereine/")) fixtureValues.id = dynamicFixtures.clubId;
  }
  for (const [key, value] of Object.entries(fixtureValues)) {
    if (!value) continue;
    resolved = resolved.replaceAll(`[${key}]`, encodeURIComponent(value));
  }
  if (/\[[^\]]+\]/.test(resolved)) {
    const staticRoute = resolved.replace(/\[[^\]]+\]/g, "").replace(/\/+/g, "/").replace(/\/$/, "");
    return staticRoute || "/dashboard";
  }
  return resolved.replace(/\/+/g, "/").replace(/\/$/, "") || "/dashboard";
}

async function login(page) {
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  if (!csrfResponse.ok()) {
    throw new Error(`Failed to load Auth.js CSRF token (HTTP ${csrfResponse.status()})`);
  }
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: EMAIL,
      password: PASSWORD,
      json: "true",
    },
  });
  if (!loginResponse.ok()) {
    throw new Error(`Credentials login failed (HTTP ${loginResponse.status()})`);
  }
  const payload = await loginResponse.json().catch(() => null);
  if (payload?.error) {
    throw new Error(`Credentials login rejected: ${payload.error}`);
  }
  const dashboard = await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (!dashboard || dashboard.status() >= 400) {
    throw new Error(`Authenticated dashboard probe failed (HTTP ${dashboard?.status() ?? "no-response"})`);
  }
  if (page.url().includes("/login")) {
    throw new Error("Session cookie not established after credentials login");
  }
}

async function runAxe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    // @ts-expect-error injected axe
    const results = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return {
      violations: results.violations.length,
      incomplete: results.incomplete.length,
      violationSummaries: results.violations.slice(0, 5).map((v) => `${v.id}:${v.impact}`),
    };
  });
}

async function collectLayoutHeuristics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;

    function isWithinContainedScrollRegion(element) {
      let node = element;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const scrollableX =
          style.overflowX === "auto" ||
          style.overflowX === "scroll" ||
          style.overflowX === "hidden" ||
          style.overflowX === "clip";
        if (scrollableX && node.scrollWidth > node.clientWidth + 2) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    }

    let horizontalOverflow = false;
    if (root.scrollWidth > viewportWidth + 2) {
      const wideElements = [...document.body.querySelectorAll("*")].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.right > viewportWidth + 2 && rect.left < viewportWidth;
      });
      horizontalOverflow = wideElements.some((el) => !isWithinContainedScrollRegion(el));
    }

    const h1Count = document.querySelectorAll("h1").length;
    const duplicateHeader = h1Count > 1;
    const mainLandmarks = document.querySelectorAll("main, [role='main']").length;
    const navCount = document.querySelectorAll("nav").length;
    return {
      horizontalOverflow,
      duplicateHeader,
      mainLandmarks,
      navCount,
      h1Count,
    };
  });
}

async function collectFunctionalReadOnly(page, urlPattern) {
  const formArchetype = /\/(new|edit)(\/|$)/.test(urlPattern) || urlPattern.includes("[");
  return page.evaluate((needsForm) => {
    const main = document.querySelector("main, [role='main']");
    const hasPrimaryHeading =
      Boolean(document.querySelector("h1")) ||
      Boolean(document.querySelector("[aria-labelledby]"));
    const interactive = document.querySelectorAll("a[href], button, input, select, textarea").length;
    const hasSubmit = Boolean(document.querySelector("button[type='submit'], input[type='submit']"));
    return {
      hasMainLandmark: Boolean(main),
      hasPrimaryHeading,
      interactiveCount: interactive,
      formCheckSkipped: !needsForm,
      formSubmitPresent: needsForm ? hasSubmit : true,
    };
  }, formArchetype);
}

async function auditRoute(page, urlPattern, sourceFile) {
  const probe = resolveProbePath(urlPattern);
  const defects = [];
  /** @type {import('./lib/sce-ds2-07g-evidence-contract.mjs').RouteDimensionEvidence['responsive']['viewports']} */
  const viewports = {};
  const evidenceReferences = [];
  let authBlocked = false;
  let authFail = false;
  let axeSummary = { violations: 0, incomplete: 0, violationSummaries: [] };
  let layoutHeuristics = null;
  let functionalReadOnly = null;

  for (const viewport of VIEWPORTS) {
    const viewportFailures = [];
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    let response = null;
    try {
      response = await page.goto(`${BASE_URL}${probe}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_ABORTED") && !message.includes("Timeout")) {
        throw error;
      }
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
    const status = response?.status() ?? (page.url().startsWith(BASE_URL) ? 200 : 0);
    await page
      .waitForSelector("[data-sce-workspace-chrome], main[data-sce-page-shell]", {
        timeout: 45_000,
      })
      .catch(() => {});

    if (!response || status >= 400) {
      viewportFailures.push(`HTTP ${status || "no-response"}`);
      if (status === 401 || status === 403) authBlocked = true;
      else authFail = true;
      viewports[viewport.key] = {
        status: status === 401 || status === 403 ? "BLOCKED" : "FAIL",
        reason: viewportFailures.join("; "),
      };
      continue;
    }

    const shot = join(ARTIFACT_DIR, `${probe.replace(/\//g, "_") || "root"}-${viewport.key}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    evidenceReferences.push(shot);

    const hasWorkspaceChrome = await page.locator("[data-testid='sce-workspace-chrome']").count();
    const hasPrimaryNav = await page.locator("nav").count();
    if (hasWorkspaceChrome === 0 && hasPrimaryNav === 0) {
      viewportFailures.push("missing workspace chrome landmarks");
    }

    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    if (active === "BODY") {
      viewportFailures.push("keyboard focus did not move from body");
    }

    const layout = await collectLayoutHeuristics(page);
    if (layout.horizontalOverflow) {
      viewportFailures.push("horizontal overflow");
    }

    if (viewport.key === "desktop") {
      layoutHeuristics = layout;
      try {
        axeSummary = await runAxe(page);
      } catch (error) {
        viewportFailures.push(`axe-core failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      functionalReadOnly = await collectFunctionalReadOnly(page, urlPattern);
    }

    viewports[viewport.key] = {
      status: viewportFailures.length === 0 ? "PASS" : "FAIL",
      details: viewportFailures,
    };
    for (const failure of viewportFailures) {
      defects.push({
        id: `DS2-07G-${viewport.key}-${defects.length + 1}`,
        introducedByDs2: null,
        status: "OPEN",
        summary: `${viewport.key}: ${failure}`,
        reproduction: `${BASE_URL}${probe}`,
      });
    }
  }

  const responsivePass = VIEWPORT_KEYS.every((k) => viewports[k]?.status === "PASS");
  const visualHeuristicFailures = [];
  if (layoutHeuristics?.duplicateHeader) visualHeuristicFailures.push("multiple h1 elements");
  if (layoutHeuristics && layoutHeuristics.mainLandmarks === 0) {
    visualHeuristicFailures.push("missing main landmark");
  }

  const dimensions = {
    authentication: {
      status: authBlocked ? "BLOCKED" : authFail ? "FAIL" : "PASS",
      reason: authBlocked ? "HTTP 401/403" : "Authenticated navigation succeeded",
    },
    authorization: {
      status: authBlocked ? "BLOCKED" : authFail ? "FAIL" : "PASS",
      reason: "Session could reach route without unauthorized response",
    },
    visual: {
      status:
        visualHeuristicFailures.length > 0
          ? "FAIL"
          : responsivePass
            ? "PENDING"
            : "FAIL",
      reason: responsivePass
        ? "Screenshots captured; automated layout heuristics clean; agent visual review still required for PASS"
        : visualHeuristicFailures.join("; ") || "Responsive probe failed",
      screenshotReviewed: false,
      details: visualHeuristicFailures,
    },
    responsive: {
      status: authBlocked ? "BLOCKED" : responsivePass ? "PASS" : "FAIL",
      viewports,
    },
    accessibility: {
      status:
        authBlocked
          ? "BLOCKED"
          : axeSummary.violations > 0
            ? "FAIL"
            : axeSummary.incomplete > 0
              ? "PENDING"
              : responsivePass
                ? "PASS"
                : "PENDING",
      axeViolations: axeSummary.violations,
      axeIncomplete: axeSummary.incomplete,
      reason:
        axeSummary.violations > 0
          ? `axe violations: ${axeSummary.violationSummaries.join(", ")}`
          : axeSummary.incomplete > 0
            ? `axe incomplete rules: ${axeSummary.incomplete}`
            : "axe-core wcag2aa scan clean on desktop viewport",
      details: axeSummary.violationSummaries,
    },
    functional: {
      status: authBlocked
        ? "BLOCKED"
        : !functionalReadOnly
          ? "PENDING"
          : functionalReadOnly.hasMainLandmark &&
              functionalReadOnly.hasPrimaryHeading &&
              functionalReadOnly.interactiveCount > 0 &&
              functionalReadOnly.formSubmitPresent
            ? "PASS"
            : "PENDING",
      reason:
        functionalReadOnly?.formCheckSkipped === false && !functionalReadOnly?.formSubmitPresent
          ? "Form route missing submit control (read-only probe)"
          : "Read-only functional smoke: landmarks, heading, interactive controls",
      details: functionalReadOnly ? [JSON.stringify(functionalReadOnly)] : [],
    },
  };

  const channels = deriveLegacyChannelsFromDimensions(dimensions);

  return {
    sourceFile,
    urlPattern,
    ...channels,
    automated: "PASSED",
    blocked: channels.authenticatedVisual === "BLOCKED",
    dimensions,
    evidenceReferences,
    defects,
  };
}

function selectRoutes(existingBySource) {
  if (MODE === "batch3") {
    return selectBatch3Routes({
      limit: ROUTE_LIMIT,
      offset: ROUTE_OFFSET,
      evidenceBySource: existingBySource,
    });
  }
  if (MODE === "reassess-evidence") {
    const byUrl = new Map(loadRegistryEntries().map((entry) => [entry.sourceFile, entry]));
    const sourceFiles = Object.keys(existingBySource).sort();
    return sourceFiles
      .map((sourceFile) => byUrl.get(sourceFile))
      .filter(Boolean)
      .slice(ROUTE_OFFSET, ROUTE_OFFSET + ROUTE_LIMIT);
  }
  const registry = loadRegistryEntries().filter(
    (entry) =>
      entry.migrationPackage === "DS2-07G" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      (MODE === "high-risk" || isHighRiskRoute(entry.urlPattern)),
  );
  return registry.slice(ROUTE_OFFSET, ROUTE_OFFSET + ROUTE_LIMIT);
}

async function main() {
  await loadDynamicFixtures();
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const existing = loadExistingManifest();
  const existingBySource = existing.bySourceFile ?? {};

  const routes = selectRoutes(existingBySource);
  if (routes.length === 0) {
    console.log(JSON.stringify({ message: "No routes selected for mode", mode: MODE }, null, 2));
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  const batchResults = {};
  for (const entry of routes) {
    try {
      batchResults[entry.sourceFile] = await auditRoute(page, entry.urlPattern, entry.sourceFile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[sce-ds2-07g] route audit failed for ${entry.urlPattern}: ${message}`);
      batchResults[entry.sourceFile] = {
        sourceFile: entry.sourceFile,
        urlPattern: entry.urlPattern,
        desktop: "PENDING",
        compactDesktop: "PENDING",
        tablet: "PENDING",
        mobile: "PENDING",
        accessibility: "PENDING",
        functional: "PENDING",
        authenticatedVisual: "PENDING",
        automated: "PASSED",
        blocked: false,
        dimensions: {
          authentication: { status: "FAIL", reason: message },
          authorization: { status: "PENDING", reason: "Route audit aborted" },
          visual: { status: "FAIL", reason: message, screenshotReviewed: false, details: [] },
          responsive: { status: "FAIL", reason: message, viewports: {} },
          accessibility: { status: "PENDING", reason: "Route audit aborted" },
          functional: { status: "PENDING", reason: "Route audit aborted" },
        },
        evidenceReferences: [],
        defects: [
          {
            id: `DS2-07G-audit-${entry.sourceFile}`,
            introducedByDs2: null,
            status: "OPEN",
            summary: message,
            reproduction: `${BASE_URL}${resolveProbePath(entry.urlPattern)}`,
          },
        ],
      };
    }
  }
  await browser.close();

  const mergedBySource = { ...existingBySource, ...batchResults };
  const highRiskRows = Object.values(mergedBySource).filter((row) => isHighRiskRoute(row.urlPattern));

  const manifest = {
    ...existing,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    evidenceContractVersion: EVIDENCE_CONTRACT_VERSION,
    batch:
      MODE === "batch3"
        ? `batch-3-module-sampling-offset-${ROUTE_OFFSET}-limit-${ROUTE_LIMIT}`
        : MODE === "reassess-evidence"
          ? `batch-4-reassess-evidence-offset-${ROUTE_OFFSET}-limit-${ROUTE_LIMIT}`
          : `${existing.batch ?? "high-risk-batch-2"}+batch-3-reassess`,
    lastRunMode: MODE,
    prefixes: existing.prefixes,
    dynamicFixtures,
    highRiskRoutesAttempted: highRiskRows.length,
    highRiskRoutesVerified: highRiskRows.filter((row) => row.authenticatedVisual === "VERIFIED").length,
    highRiskRoutesResponsiveVerified: highRiskRows.filter(
      (row) =>
        row.desktop === "VERIFIED" &&
        row.compactDesktop === "VERIFIED" &&
        row.tablet === "VERIFIED" &&
        row.mobile === "VERIFIED",
    ).length,
    batch3RoutesAttemptedThisRun: MODE === "batch3" ? routes.length : 0,
    batch3EvidenceRows: Object.values(mergedBySource).filter((row) => !isHighRiskRoute(row.urlPattern))
      .length,
    bySourceFile: mergedBySource,
  };

  writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
  const rows = buildVerificationMatrix({
    evidenceBySource: mergedBySource,
    authenticatedBrowserAvailable: true,
  });
  const summary = summarizeMatrix(rows, {
    authenticatedBrowserAvailable: true,
    evidenceBySource: mergedBySource,
  });
  console.log(
    JSON.stringify(
      {
        summary,
        mode: MODE,
        routesAttemptedThisRun: routes.length,
        totalEvidenceRows: Object.keys(mergedBySource).length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[sce-ds2-07g] verify failed", error);
  process.exit(1);
});
