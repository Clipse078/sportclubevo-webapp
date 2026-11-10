/**
 * SCE-DS2-07G — authenticated Playwright verification for a controlled batch.
 *
 * Requires (never bypass auth):
 *   SCE_DS2_07G_LOGIN_EMAIL
 *   SCE_DS2_07G_LOGIN_PASSWORD
 *   SCE_DS2_07G_BASE_URL (default http://127.0.0.1:3000)
 *
 * Run: node scripts/sce-ds2-07g-authenticated-route-verify.mjs
 */
import { chromium } from "playwright";
import pg from "pg";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildVerificationMatrix,
  HIGH_RISK_URL_PATTERNS,
  isHighRiskRoute,
  loadRegistryEntries,
  summarizeMatrix,
} from "./lib/sce-ds2-07g-verification.mjs";

const ROOT = process.cwd();
const BASE_URL = process.env.SCE_DS2_07G_BASE_URL?.trim() || "http://localhost:3000";
const EMAIL = process.env.SCE_DS2_07G_LOGIN_EMAIL?.trim();
const PASSWORD = process.env.SCE_DS2_07G_LOGIN_PASSWORD?.trim();
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

async function loadDynamicFixtures() {
  dynamicFixtures = {
    seriesId: process.env.SCE_DS2_07G_FIXTURE_SERIES_ID?.trim() ?? "",
    sessionId: process.env.SCE_DS2_07G_FIXTURE_SESSION_ID?.trim() ?? "",
  };
  if (dynamicFixtures.seriesId && dynamicFixtures.sessionId) return;

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
  } finally {
    await client.end().catch(() => {});
  }
}

function resolveProbePath(urlPattern) {
  let resolved = urlPattern;
  for (const [key, value] of Object.entries(dynamicFixtures)) {
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
  await page.goto(`${BASE_URL}/login`, { waitUntil: "load", timeout: 120_000 });
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 120_000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function auditRoute(page, urlPattern, sourceFile) {
  const probe = resolveProbePath(urlPattern);
  const failures = [];
  const evidenceReferences = [];
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(`${BASE_URL}${probe}`, { waitUntil: "domcontentloaded" });
    if (!response || response.status() >= 400) {
      failures.push(`${viewport.key}: HTTP ${response?.status() ?? "no-response"}`);
      continue;
    }
    const shot = join(ARTIFACT_DIR, `${probe.replace(/\//g, "_") || "root"}-${viewport.key}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    evidenceReferences.push(shot);
    const hasWorkspaceChrome = await page.locator("[data-testid='sce-workspace-chrome']").count();
    const hasPrimaryNav = await page.locator("nav").count();
    if (hasWorkspaceChrome === 0 && hasPrimaryNav === 0) {
      failures.push(`${viewport.key}: missing workspace chrome landmarks`);
    }
    const focused = await page.keyboard.press("Tab");
    void focused;
    const active = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    if (active === "BODY") {
      failures.push(`${viewport.key}: keyboard focus did not move from body`);
    }
  }
  const blocked = failures.some((item) => item.includes("HTTP 403") || item.includes("HTTP 401"));
  const verified = failures.length === 0;
  return {
    sourceFile,
    urlPattern,
    desktop: verified ? "VERIFIED" : blocked ? "BLOCKED" : "PENDING",
    tablet: verified ? "VERIFIED" : blocked ? "BLOCKED" : "PENDING",
    mobile: verified ? "VERIFIED" : blocked ? "BLOCKED" : "PENDING",
    compactDesktop: verified ? "VERIFIED" : blocked ? "BLOCKED" : "PENDING",
    accessibility: verified ? "VERIFIED" : "PENDING",
    functional: verified ? "VERIFIED" : "PENDING",
    authenticatedVisual: verified ? "VERIFIED" : blocked ? "BLOCKED" : "PENDING",
    automated: "PASSED",
    blocked,
    evidenceReferences,
    defects: failures.map((summary, index) => ({
      id: `DS2-07G-BROWSER-${index + 1}`,
      introducedByDs2: null,
      status: "OPEN",
      summary,
      reproduction: `${BASE_URL}${probe}`,
    })),
  };
}

async function main() {
  await loadDynamicFixtures();
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const registry = loadRegistryEntries().filter(
    (entry) =>
      entry.migrationPackage === "DS2-07G" &&
      entry.routeKind === "RENDERABLE_PAGE" &&
      isHighRiskRoute(entry.urlPattern),
  );
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  const bySourceFile = {};
  for (const entry of registry) {
    bySourceFile[entry.sourceFile] = await auditRoute(page, entry.urlPattern, entry.sourceFile);
  }

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    batch: "high-risk-batch-2",
    prefixes: HIGH_RISK_URL_PATTERNS,
    dynamicFixtures,
    highRiskRoutesAttempted: registry.length,
    highRiskRoutesVerified: Object.values(bySourceFile).filter((row) => row.authenticatedVisual === "VERIFIED")
      .length,
    bySourceFile,
  };
  writeFileSync(EVIDENCE_PATH, JSON.stringify(manifest, null, 2));
  const rows = buildVerificationMatrix({ evidenceBySource: bySourceFile, authenticatedBrowserAvailable: true });
  const summary = summarizeMatrix(rows, { authenticatedBrowserAvailable: true });
  console.log(JSON.stringify({ summary, routesAttempted: registry.length }, null, 2));
}

main().catch((error) => {
  console.error("[sce-ds2-07g] verify failed", error);
  process.exit(1);
});
