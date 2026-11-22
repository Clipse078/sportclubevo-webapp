/**
 * PR #1025 — browser regression: Dokumentation page lifecycle (⋯ menu, Archiv, Papierkorb).
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = Number.parseInt(process.env.TENANT_DOC_BROWSER_PORT ?? "3098", 10);
const BASE_URL =
  process.env.TENANT_DOC_BROWSER_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
const TEST_DB = process.env.TEST_DATABASE_URL?.trim();

function assertLocalTestDb(url) {
  if (!url) throw new Error("TEST_DATABASE_URL required (local disposable only)");
  const host = new URL(url).hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error("Refusing lifecycle browser regression on non-local TEST_DATABASE_URL");
  }
}

async function login(page, email, password) {
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password, json: "true", callbackUrl: `${BASE_URL}/dashboard` },
    maxRedirects: 0,
  });
  if (loginResponse.status() !== 302 && !loginResponse.ok()) {
    throw new Error(`Login failed HTTP ${loginResponse.status()}`);
  }
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (page.url().includes("/login")) {
    throw new Error("Session cookie not established after credentials login");
  }
}

function startProductionServer(env) {
  return spawn("npm", ["run", "start", "--", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function releasePort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        //
      }
    }
    if (out) {
      execSync("sleep 2");
    }
  } catch {
    //
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/csrf`);
      if (res.ok) return;
    } catch {
      //
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Production server did not become ready at ${BASE_URL}`);
}

async function main() {
  assertLocalTestDb(TEST_DB);
  if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required");
  }

  releasePort(PORT);

  const migrateEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    SCE_DATA_ENVIRONMENT: "LOCAL",
    SCE_OPERATION_AUTHORIZATION: "tenant-documentation-lifecycle-browser-regression",
    NEXTAUTH_URL: BASE_URL,
    AUTH_URL: BASE_URL,
  };

  if (process.env.TENANT_DOC_BROWSER_SKIP_BUILD !== "1") {
    execSync("npm run build", { stdio: "inherit", env: migrateEnv });
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: migrateEnv });

  const fixtureJson = execSync("npx tsx scripts/tenant-documentation-lifecycle-browser-fixture.ts", {
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB },
  });
  const fixture = JSON.parse(fixtureJson.trim().split("\n").pop());

  const serverEnv = {
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    APP_ENV: "test",
    SCE_DATA_ENVIRONMENT: "LOCAL",
    NEXTAUTH_URL: BASE_URL,
    AUTH_URL: BASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };
  const server = startProductionServer(serverEnv);
  const shutdown = () => {
    try {
      server.kill("SIGKILL");
    } catch {
      //
    }
    releasePort(PORT);
  };
  process.on("exit", shutdown);

  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await login(page, fixture.email, fixture.password);

    const parentUrl = `${BASE_URL}/dashboard/dokumentation/p/${fixture.parentPageId}`;
    await page.goto(parentUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTitle("Seitenmenü").click();
    await page.getByRole("menuitem", { name: /Archivieren/i }).waitFor({ state: "visible" });
    await page.getByRole("menuitem", { name: /Seite löschen/i }).waitFor({ state: "visible" });
    await page.keyboard.press("Escape");

    const menuRes = await page.request.post(
      `${BASE_URL}/api/tenant-documentation/pages/${fixture.parentPageId}/archive`,
    );
    const menuPayload = await menuRes.json();
    if (menuRes.status() !== 409 || menuPayload.code !== "HAS_ACTIVE_CHILDREN") {
      throw new Error(`Expected HAS_ACTIVE_CHILDREN guard, got ${menuRes.status()} ${JSON.stringify(menuPayload)}`);
    }

    const leafUrl = `${BASE_URL}/dashboard/dokumentation/p/${fixture.leafPageId}`;
    await page.goto(leafUrl, { waitUntil: "domcontentloaded" });
    await page.getByTitle("Seitenmenü").click();
    const archiveDone = page.waitForResponse(
      (res) =>
        res.url().includes(`/pages/${fixture.leafPageId}/archive`) &&
        res.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByRole("menuitem", { name: /Archivieren/i }).click();
    const archiveRes = await archiveDone;
    if (!archiveRes.ok()) {
      throw new Error(`Archive failed HTTP ${archiveRes.status()}`);
    }
    await page.waitForURL(/\/dashboard\/dokumentation/, { timeout: 60_000 });

    await page.goto(`${BASE_URL}/dashboard/dokumentation/archiv`, { waitUntil: "networkidle" });
    const archivedDeadline = Date.now() + 60_000;
    while (Date.now() < archivedDeadline) {
      if (await page.getByText(fixture.leafTitle).isVisible().catch(() => false)) break;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
    }
    await page.getByText(fixture.leafTitle).waitFor({ state: "visible", timeout: 5_000 });
    await page.screenshot({ path: "/opt/cursor/artifacts/dokumentation-lifecycle-archiv.png" });

    await page.getByRole("button", { name: /Wiederherstellen/i }).first().click();
    await page.waitForURL(new RegExp(fixture.leafPageId), { timeout: 60_000 });

    await page.goto(leafUrl, { waitUntil: "domcontentloaded" });
    await page.getByTitle("Seitenmenü").click();
    await page.getByRole("menuitem", { name: /Seite löschen/i }).click();
    await page.getByRole("button", { name: /In Papierkorb verschieben/i }).click();
    await page.waitForURL(/\/dashboard\/dokumentation/, { timeout: 60_000 });

    await page.goto(leafUrl, { waitUntil: "domcontentloaded" });
    await page.getByText(/Papierkorb/i).waitFor({ state: "visible" });
    await page.screenshot({ path: "/opt/cursor/artifacts/dokumentation-lifecycle-papierkorb.png" });
    await page.getByRole("button", { name: /Wiederherstellen/i }).click();
    await page.waitForURL(new RegExp(fixture.leafPageId), { timeout: 60_000 });
    await page.getByTestId("workspace-page-title").waitFor({ state: "visible" });

    await page.goto(parentUrl, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: "/opt/cursor/artifacts/dokumentation-workspace-read-1440.png" });
    await page.getByRole("button", { name: /Bearbeiten/i }).click();
    await page
      .locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror')
      .waitFor({ state: "visible", timeout: 90_000 });
    await page.screenshot({ path: "/opt/cursor/artifacts/dokumentation-workspace-edit-1440.png" });

    await browser.close();

    const report = { status: "PASS", fixture, verifiedAt: new Date().toISOString() };
    writeFileSync(
      "/opt/cursor/artifacts/tenant-documentation-lifecycle-browser-regression.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    shutdown();
  }
}

main().catch((err) => {
  console.error("[tenant-documentation-lifecycle-browser-regression] FAILED:", err);
  process.exit(1);
});