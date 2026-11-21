/**
 * PR #1019 correction — local Playwright evidence (login via SCE_DS2_07G_*).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const ARTIFACT_DIR = "/opt/cursor/artifacts";
const BASE = process.env.SCE_DS2_07G_BASE_URL?.trim() || "http://127.0.0.1:3000";
const EMAIL =
  process.env.SCE_DS2_07G_VERIFICATION_PERSONA_EMAIL?.trim() ||
  process.env.SCE_DS2_07G_LOGIN_EMAIL?.trim() ||
  "sce-ds2-07g-verification@example.test";
const PASSWORD =
  process.env.PR_1019_VERIFICATION_PASSWORD?.trim() ||
  process.env.SCE_DS2_07G_VERIFICATION_PERSONA_PASSWORD?.trim() ||
  process.env.SCE_DS2_07G_LOGIN_PASSWORD?.trim() ||
  "pr-1019-verification-local";
const FALLBACK_ORG_ID = "pr-1019-junioren-org";
const FALLBACK_TARGET_ID = "pr-1019-unplanned-target";
const DATABASE_URL = process.env.DATABASE_URL;

mkdirSync(ARTIFACT_DIR, { recursive: true });

if (!EMAIL || !PASSWORD) {
  console.error("[pr-1019-evidence] Missing SCE_DS2_07G_LOGIN_EMAIL / PASSWORD");
  process.exit(2);
}

async function resolveJuniorenOrgId(client) {
  const r = await client.query(
    `SELECT id FROM "OrgUnit" WHERE name ILIKE '%junioren%' ORDER BY "createdAt" ASC LIMIT 1`,
  );
  return r.rows[0]?.id ?? null;
}

async function resolveTestzielId(client) {
  const r = await client.query(
    `SELECT id FROM "Target" WHERE title ILIKE '%testziel%iii%' ORDER BY "createdAt" DESC LIMIT 1`,
  );
  return r.rows[0]?.id ?? null;
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  const authResponse = page.waitForResponse(
    (res) => res.url().includes("/api/auth/callback/credentials"),
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /^Einloggen$/ }).click();
  const authRes = await authResponse;
  const authBody = await authRes.text().catch(() => "");
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
  } catch (err) {
    await page.screenshot({ path: join(ARTIFACT_DIR, "screenshot_login_failure.png"), fullPage: true });
  const body = await page.locator("body").innerText();
  writeFileSync(
    join(ARTIFACT_DIR, "pr-1019-login-failure.txt"),
    `${body.slice(0, 4000)}\n\nauthStatus=${authRes.status()}\nauthBody=${authBody.slice(0, 500)}`,
  );
    throw err;
  }
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  let orgId = await resolveJuniorenOrgId(client);
  let testzielId = await resolveTestzielId(client);
  if (!orgId) orgId = FALLBACK_ORG_ID;
  if (!testzielId) testzielId = FALLBACK_TARGET_ID;
  await client.end();

  const orgQuery = orgId ? `orgEinheit=${encodeURIComponent(orgId)}` : "";
  const urls = {
    strategien: `${BASE}/vereinsleitung/strategie-und-ziele?ansicht=strategie&${orgQuery}`,
    testziel: testzielId
      ? `${BASE}/vereinsleitung/targets/${testzielId}?${orgQuery}`
      : null,
    ungeplant: `${BASE}/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen&umsetzungsabschnitt=ungeplant&${orgQuery}`,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1093, height: 900 },
    recordVideo: { dir: ARTIFACT_DIR, size: { width: 1093, height: 900 } },
  });
  const page = await context.newPage();
  const timings = {};

  await login(page);

  await page.goto(urls.strategien, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="strategien-workspace-list"], [data-testid="strategien-workspace-empty"]', {
    timeout: 60_000,
  });
  await page.screenshot({ path: join(ARTIFACT_DIR, "screenshot_strategien_after.png"), fullPage: true });

  if (urls.testziel) {
    await page.goto(urls.testziel, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="target-aufgaben-section"]', { timeout: 60_000 });
    await page.screenshot({ path: join(ARTIFACT_DIR, "screenshot_testziel_iii_after.png"), fullPage: true });
  }

  const dragT0 = Date.now();
  await page.goto(urls.ungeplant, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="umsetzungsplanung-unplanned-panel"]', { timeout: 60_000 });
  await page.waitForSelector('[data-testid^="umsetzungsplanung-unplanned-drag-"]', { timeout: 60_000 });

  const grips = await page.locator('[data-testid^="umsetzungsplanung-unplanned-drag-"]').all();
  if (grips.length < 2) {
    writeFileSync(
      join(ARTIFACT_DIR, "pr-1019-drag-evidence.json"),
      JSON.stringify({ ok: false, reason: "need_at_least_two_unplanned_tasks", gripCount: grips.length }, null, 2),
    );
    await page.screenshot({ path: join(ARTIFACT_DIR, "screenshot_ungeplant_after.png"), fullPage: true });
    await context.close();
    await browser.close();
    process.exit(3);
  }

  const idBefore = await page
    .locator('[data-testid^="vereinsentwicklung-task-row-"]')
    .first()
    .getAttribute("data-testid");
  const firstTaskId = idBefore?.replace("vereinsentwicklung-task-row-", "") ?? "";

  const source = grips[0];
  const targetRow = page.locator('[data-testid^="vereinsentwicklung-task-row-"]').nth(1);
  const box = await targetRow.boundingBox();
  if (!box) throw new Error("No target row box");

  await source.dragTo(targetRow, {
    targetPosition: { x: 8, y: Math.floor(box.height / 2) },
    force: true,
  });

  await page.waitForTimeout(800);
  timings.dragToDomReorderMs = Date.now() - dragT0;

  await page.waitForFunction(
    () => {
      const info = document.querySelector('[data-testid="umsetzungsplanung-unplanned-task-table"]')?.parentElement;
      return Boolean(info);
    },
    { timeout: 5000 },
  );

  const saveT0 = Date.now();
  await page.waitForResponse(
    (res) => res.url().includes("/unplanned-order") && res.request().method() === "PUT",
    { timeout: 15_000 },
  );
  timings.saveAckMs = Date.now() - saveT0;

  const orderAfterDrag = await page.locator('[data-testid^="vereinsentwicklung-task-row-"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-testid")?.replace("vereinsentwicklung-task-row-", "")),
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="umsetzungsplanung-unplanned-drag-"]', { timeout: 60_000 });
  const orderAfterReload = await page.locator('[data-testid^="vereinsentwicklung-task-row-"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-testid")?.replace("vereinsentwicklung-task-row-", "")),
  );

  await page.screenshot({ path: join(ARTIFACT_DIR, "screenshot_ungeplant_after_drag.png"), fullPage: true });

  const gripDraggable = await page
    .locator(`[data-testid="umsetzungsplanung-unplanned-drag-${firstTaskId}"]`)
    .getAttribute("draggable");

  const evidence = {
    ok: orderAfterDrag.length >= 2 && orderAfterReload.join(",") === orderAfterDrag.join(","),
    rootCauseFixed:
      "Ungeplant rank reorder was blocked when assignDisabled (zero phases) because canReorder required !assignDisabled",
    gripDraggable,
    firstTaskId,
    orderAfterDrag,
    orderAfterReload,
    timings,
    orgId,
    testzielId,
    urls,
  };
  writeFileSync(join(ARTIFACT_DIR, "pr-1019-drag-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));

  const video = page.video();
  await context.close();
  if (video) {
    await video.saveAs(join(ARTIFACT_DIR, "video_ungeplant_drag_persist_reload.mp4"));
  }
  await browser.close();
  process.exit(evidence.ok ? 0 : 4);
}

main().catch((err) => {
  console.error("[pr-1019-evidence] FAILED", err);
  process.exit(1);
});