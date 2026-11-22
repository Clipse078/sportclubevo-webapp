/**
 * PR #1025 — production-build browser regression: Dokumentation edit + autosave.
 *
 * Requires local disposable TEST_DATABASE_URL, AUTH_SECRET, and `npm run build` output.
 *
 * Run:
 *   TENANT_DOC_BROWSER_REGRESSION=1 npm run tenant-documentation:edit-browser-regression
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);

const PORT = Number.parseInt(process.env.TENANT_DOC_BROWSER_PORT ?? "3099", 10);
const BASE_URL =
  process.env.TENANT_DOC_BROWSER_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
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

function releasePort(port) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        //
      }
    }
  } catch {
    // port free
  }
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
  throw new Error(
    `Production server did not become ready at ${BASE_URL} (see server log in test output)`,
  );
}

async function main() {
  assertLocalTestDb(TEST_DB);

  if (!process.env.AUTH_SECRET?.trim() && !process.env.NEXTAUTH_SECRET?.trim()) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required for credentials login");
  }

  releasePort(PORT);

  const migrateEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    SCE_DATA_ENVIRONMENT: "LOCAL",
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
    SCE_DATA_ENVIRONMENT: "LOCAL",
    NEXTAUTH_URL: BASE_URL,
    AUTH_URL: BASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };
  const server = startProductionServer(serverEnv);
  const serverLog = [];
  server.stdout?.on("data", (c) => serverLog.push(String(c)));
  server.stderr?.on("data", (c) => serverLog.push(String(c)));

  const shutdown = () => {
    try {
      server.kill("SIGKILL");
    } catch {
      //
    }
    releasePort(PORT);
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => process.exit(1));

  try {
    try {
      await waitForServer();
    } catch (err) {
      writeFileSync(
        "/opt/cursor/artifacts/tenant-doc-browser-server.log",
        serverLog.join(""),
      );
      throw err;
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const requestFailures = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" || /Yjs was already imported/i.test(text)) {
        consoleErrors.push(`[${msg.type()}] ${text}`);
      }
    });
    page.on("requestfailed", (req) => {
      requestFailures.push(`${req.url()} :: ${req.failure()?.errorText ?? "failed"}`);
    });

    await login(page, fixture.email, fixture.password);

    const pageUrl = `${BASE_URL}/dashboard/dokumentation/p/${fixture.pageId}`;
    const initial = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForResponse(
      (res) =>
        res.url().includes("/api/tenant-documentation/spaces") && res.request().method() === "GET",
      { timeout: 60_000 },
    );
    if (!initial || initial.status() >= 500) {
      throw new Error(`Detail page failed HTTP ${initial?.status()}`);
    }
    if (await page.getByText("couldn't load").count()) {
      throw new Error("Detail page showed error boundary on open");
    }

    const bearbeitenVisible = await page
      .getByRole("button", { name: /Bearbeiten/i })
      .isVisible()
      .catch(() => false);
    if (!bearbeitenVisible) {
      writeFileSync(
        "/opt/cursor/artifacts/tenant-doc-detail-no-bearbeiten.html",
        await page.content(),
      );
      throw new Error(
        `Bearbeiten control missing on direct page load (canEdit denied?). url=${page.url()} console=${consoleErrors.join(" | ")}`,
      );
    }

    async function openEditorFromReadView(label) {
      const btn = page.getByRole("button", { name: /Bearbeiten/i });
      await btn.waitFor({ state: "visible", timeout: 60_000 });
      await btn.click({ timeout: 60_000 });
      await page
        .waitForResponse(
          (res) =>
            res.url().includes("/collaboration") &&
            res.request().method() === "POST" &&
            res.ok(),
          { timeout: 90_000 },
        )
        .catch(() => null);
      const editor = page.locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror');
      try {
        await editor.waitFor({ state: "visible", timeout: 90_000 });
      } catch (err) {
        const body = await page.content();
        writeFileSync(
          `/opt/cursor/artifacts/tenant-doc-edit-failure-${label}.html`,
          body,
        );
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-edit-browser-console.json",
          JSON.stringify({ label, pageErrors, consoleErrors, requestFailures }, null, 2),
        );
        throw new Error(
          `Editor did not mount (${label}). pageErrors=${pageErrors.join(" | ")} console=${consoleErrors.join(" | ")} requests=${requestFailures.join(" | ")} cause=${err}`,
        );
      }
      return editor;
    }

    const editor = await openEditorFromReadView("read-then-bearbeiten");

    const token = `E2E-${Date.now()}`;
    await editor.click();
    await page.keyboard.type(token, { delay: 15 });

    const saveStatus = page.getByTestId("tenant-doc-save-status");
    try {
      await saveStatus.getByText(/gespeichert/i).waitFor({ timeout: 90_000 });
    } catch {
      const label = await saveStatus.innerText();
      throw new Error(`Autosave did not complete (status="${label}")`);
    }

    const beforeReloadText = await editor.evaluate((el) => el.textContent ?? "");
    if (!beforeReloadText.includes(token)) {
      throw new Error(`Typed token missing before reload (got "${beforeReloadText}")`);
    }

    await page.waitForTimeout(3_500);

    await page.reload({ waitUntil: "domcontentloaded" });
    if (await page.getByText("couldn't load").count()) {
      throw new Error("Error boundary after reload");
    }

    const editorAfterReload = await openEditorFromReadView("direct-reload-then-bearbeiten");
    let bodyText = "";
    const persistenceDeadline = Date.now() + 60_000;
    while (Date.now() < persistenceDeadline) {
      bodyText = await editorAfterReload.evaluate((el) => el.textContent ?? "");
      if (bodyText.includes(token)) break;
      await page.waitForTimeout(500);
    }
    if (!bodyText.includes(token)) {
      throw new Error(`Draft text not persisted after reload (expected ${token}, got "${bodyText.slice(0, 200)}")`);
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