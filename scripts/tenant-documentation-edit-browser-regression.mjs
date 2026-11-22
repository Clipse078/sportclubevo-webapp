/**
 * PR #1025 — production-build browser regression: Dokumentation edit + autosave.
 *
 * Requires local disposable TEST_DATABASE_URL, AUTH_SECRET, and `npm run build` output.
 *
 * Run:
 *   TENANT_DOC_BROWSER_REGRESSION=1 npm run tenant-documentation:edit-browser-regression
 */
import { execSync, spawn } from "node:child_process";
import { chmodSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);

const BASE_URL = process.env.TENANT_DOC_BROWSER_BASE_URL?.trim() || "http://127.0.0.1:3099";
const PORT = Number.parseInt(process.env.TENANT_DOC_BROWSER_PORT ?? "3099", 10);
const TEST_DB = process.env.TEST_DATABASE_URL?.trim();

function assertLocalTestDb(url) {
  if (!url) throw new Error("TEST_DATABASE_URL required (local disposable only)");
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error("Refusing browser regression on non-local TEST_DATABASE_URL");
  }
}

async function login(page, email, password) {
  const csrfResponse = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  if (!csrfResponse.ok()) throw new Error(`CSRF load failed HTTP ${csrfResponse.status()}`);
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password, json: "true", callbackUrl: `${BASE_URL}/dashboard` },
    maxRedirects: 0,
  });
  if (loginResponse.status() !== 302 && !loginResponse.ok()) {
    throw new Error(`Login failed HTTP ${loginResponse.status()}`);
  }
  const payload = await loginResponse.json().catch(() => null);
  if (payload?.error) throw new Error(`Login rejected: ${payload.error}`);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  if (page.url().includes("/login")) {
    throw new Error("Session cookie not established after credentials login");
  }
}

function startProductionServer(env) {
  const child = spawn("npm", ["run", "start", "--", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return child;
}

async function waitForServer(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/csrf`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Production server did not become ready");
}

async function main() {
  assertLocalTestDb(TEST_DB);

  if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required for credentials login");
  }

  try {
    execSync(`fuser -k ${PORT}/tcp`, { stdio: "ignore" });
  } catch {
    // port already free
  }

  const migrateEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    SCE_OPERATION_AUTHORIZATION: "tenant-documentation-edit-browser-regression",
    NEXTAUTH_URL: BASE_URL,
    AUTH_URL: BASE_URL,
  };

  if (process.env.TENANT_DOC_BROWSER_SKIP_BUILD !== "1") {
    execSync("npm run build", { stdio: "inherit", env: migrateEnv });
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: migrateEnv });

  const fixtureJson = execSync("npx tsx scripts/tenant-documentation-browser-fixture.ts", {
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB,
      DIRECT_URL: TEST_DB,
    },
  });
  const fixture = JSON.parse(fixtureJson.trim().split("\n").pop());

  const serverEnv = {
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    APP_ENV: "test",
    NEXTAUTH_URL: BASE_URL,
    AUTH_URL: BASE_URL,
  };
  const server = startProductionServer(serverEnv);
  const serverLog = [];
  server.stdout?.on("data", (c) => serverLog.push(String(c)));
  server.stderr?.on("data", (c) => serverLog.push(String(c)));

  const shutdown = () => {
    server.kill("SIGTERM");
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => process.exit(1));

  try {
    await waitForServer();

    const browser = await chromium.launch();
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await login(page, fixture.email, fixture.password);

    const pageUrl = `${BASE_URL}/dashboard/dokumentation/p/${fixture.pageId}`;
    const initial = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if (!initial || initial.status() >= 500) {
      throw new Error(`Detail page failed HTTP ${initial?.status()}`);
    }
  if (await page.getByText("couldn't load").count()) {
      throw new Error("Detail page showed error boundary on open");
    }

    await page.getByRole("button", { name: /Bearbeiten/i }).click();
    const editor = page.locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror');
    try {
      await editor.waitFor({ state: "visible", timeout: 90_000 });
    } catch (err) {
      const body = await page.content();
      writeFileSync("/opt/cursor/artifacts/tenant-doc-edit-failure.html", body);
      throw new Error(
        `Editor did not mount. pageErrors=${pageErrors.join(" | ")} console=${consoleErrors.join(" | ")} cause=${err}`,
      );
    }

    const token = `E2E-${Date.now()}`;
    await editor.click();
    await page.keyboard.type(token);

    await page.getByTestId("tenant-doc-save-status").getByText(/gespeichert/i).waitFor({
      timeout: 30_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    if (await page.getByText("couldn't load").count()) {
      throw new Error("Error boundary after reload");
    }

    await page.getByRole("button", { name: /Bearbeiten/i }).click();
    await editor.waitFor({ state: "visible", timeout: 60_000 });
    const bodyText = await editor.innerText();
    if (!bodyText.includes(token)) {
      throw new Error(`Draft text not persisted after reload (expected ${token})`);
    }

    const yjsDup = pageErrors.find((e) => /Yjs was already imported/i.test(e));
    if (yjsDup) {
      throw new Error(`Yjs duplicate import: ${yjsDup}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors: ${pageErrors.join(" | ")}`);
    }

    await browser.close();
    writeFileSync(
      "/opt/cursor/artifacts/tenant-documentation-edit-browser-regression.json",
      JSON.stringify({ status: "PASS", pageUrl, pageId: fixture.pageId, token }, null, 2),
    );
    console.log(JSON.stringify({ status: "PASS", pageUrl, pageId: fixture.pageId }));
  } finally {
    shutdown();
  }
}

main().catch((err) => {
  console.error("[tenant-documentation-edit-browser-regression] FAILED:", err);
  process.exit(1);
});