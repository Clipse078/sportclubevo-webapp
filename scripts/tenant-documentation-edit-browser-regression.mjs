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
import { chromium } from "playwright";

const PORT = Number.parseInt(process.env.TENANT_DOC_BROWSER_PORT ?? "3099", 10);
const BASE_URL =
  process.env.TENANT_DOC_BROWSER_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
const TEST_DB = process.env.TEST_DATABASE_URL?.trim();

function parseFixtureStdout(stdout) {
  const line = stdout
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"))
    .pop();
  if (!line) throw new Error("Fixture did not print JSON on stdout");
  return JSON.parse(line);
}

function fixtureProcessEnv() {
  return {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    TEST_DATABASE_URL: TEST_DB,
    SCE_DATA_ENVIRONMENT: "LOCAL",
    SCE_OPERATION_AUTHORIZATION: "tenant-documentation-edit-browser-regression",
  };
}

function assertLocalTestDb(url) {
  if (!url) throw new Error("TEST_DATABASE_URL required (local disposable only)");
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error("Refusing browser regression on non-local TEST_DATABASE_URL");
  }
}

function editorPlainText(editor) {
  return editor.evaluate((el) => el.textContent ?? "");
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
  return spawn("npm", ["run", "start", "--", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function releasePort(port) {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    //
  }
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        //
      }
    }
  } catch {
    // port free
  }
  try {
    execSync("sleep 2");
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
  if (process.env.TENANT_DOC_BROWSER_SKIP_MIGRATE !== "1") {
    execSync("npx prisma migrate deploy", { stdio: "inherit", env: migrateEnv });
  }

  const fixtureJson = execSync("npx tsx scripts/tenant-documentation-browser-fixture.ts", {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: fixtureProcessEnv(),
  });
  const fixture = parseFixtureStdout(fixtureJson);

  const serverEnv = {
    ...process.env,
    DATABASE_URL: TEST_DB,
    DIRECT_URL: TEST_DB,
    TEST_DATABASE_URL: TEST_DB,
    NODE_ENV: "production",
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
  server.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      serverLog.push(`\n[server exited code=${code} signal=${signal ?? ""}]\n`);
    }
  });

  const shutdown = () => {
    try {
      server.kill("SIGKILL");
    } catch {
      //
    }
    releasePort(PORT);
  };
  process.on("SIGINT", () => {
    shutdown();
    process.exit(1);
  });

  const collaborationEvents = [];

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

    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error" || /Yjs was already imported/i.test(text)) {
        consoleErrors.push(`[${msg.type()}] ${text}`);
      }
    });

    page.on("response", async (res) => {
      if (
        !res.url().includes("/collaboration") ||
        res.request().method() !== "POST" ||
        !res.ok()
      ) {
        return;
      }
      const body = await res.json().catch(() => null);
      if (body && typeof body.draftPlainText === "string") {
        collaborationEvents.push({
          at: Date.now(),
          draftPlainText: body.draftPlainText,
          revision: body.revision,
        });
      }
    });

    await login(page, fixture.email, fixture.password);

    async function openReadDetail(pageId) {
      const pageUrl = `${BASE_URL}/dashboard/dokumentation/p/${pageId}`;
      const initial = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page
        .waitForResponse(
          (res) =>
            res.url().includes("/api/tenant-documentation/spaces") &&
            res.request().method() === "GET",
          { timeout: 60_000 },
        )
        .catch(() => null);
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
        throw new Error(`Bearbeiten missing on ${pageUrl}`);
      }
      return pageUrl;
    }

    async function openEditorFromReadView(label) {
      const btn = page.getByRole("button", { name: /Bearbeiten/i });
      await btn.waitFor({ state: "visible", timeout: 60_000 });
      const eventsBefore = collaborationEvents.length;
      await btn.click({ timeout: 60_000 });
      const collabResponse = await page
        .waitForResponse(
          (res) =>
            res.url().includes("/collaboration") &&
            res.request().method() === "POST",
          { timeout: 90_000 },
        )
        .catch(() => null);
      if (!collabResponse?.ok()) {
        const body = await collabResponse?.text().catch(() => "");
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-collaboration-failure.json",
          JSON.stringify({ status: collabResponse?.status(), body }, null, 2),
        );
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-collaboration-failure.html",
          await page.content(),
        );
        throw new Error(
          `Collaboration sync failed HTTP ${collabResponse?.status() ?? "timeout"} ${body?.slice(0, 200)}`,
        );
      }
      const firstSyncAfterOpen = collaborationEvents[eventsBefore] ?? null;
      await page.getByTestId("tenant-doc-save-status").waitFor({ state: "visible", timeout: 90_000 });
      const editor = page.locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror');
      await editor.waitFor({ state: "visible", timeout: 120_000 });
      return { editor, firstSyncAfterOpen, label };
    }

    async function waitForAutosaved() {
      const saveStatus = page.getByTestId("tenant-doc-save-status");
      try {
        await saveStatus.getByText(/gespeichert/i).waitFor({ timeout: 90_000 });
      } catch {
        throw new Error(`Autosave stuck (status="${await saveStatus.innerText()}")`);
      }
      const lastEvent = collaborationEvents[collaborationEvents.length - 1];
      if (!lastEvent?.draftPlainText) {
        throw new Error("No collaboration response with draftPlainText after autosave");
      }
      return lastEvent;
    }

    async function typeInEditor(editor, text) {
      await editor.click();
      await page.keyboard.type(text, { delay: 12 });
    }

    async function runDraftPersistenceScenario(scenarioLabel, pageId, textToType, expectedBeforeReload) {
      collaborationEvents.length = 0;
      const pageUrl = await openReadDetail(pageId);
      const { editor, firstSyncAfterOpen } = await openEditorFromReadView(`${scenarioLabel}-open`);

      if (expectedBeforeReload) {
        const pre = await editorPlainText(editor);
        if (!pre.includes(expectedBeforeReload)) {
          throw new Error(
            `${scenarioLabel}: expected existing draft "${expectedBeforeReload}" before typing, got "${pre.slice(0, 200)}"`,
          );
        }
      }

      await typeInEditor(editor, textToType);
      const lastAutosave = await waitForAutosaved();
      const fullExpected = `${expectedBeforeReload ?? ""}${textToType}`;

      const preReload = await editorPlainText(editor);
      if (!preReload.includes(fullExpected)) {
        throw new Error(
          `${scenarioLabel}: editor missing full text before reload (expected "${fullExpected}", got "${preReload.slice(0, 200)}")`,
        );
      }

      const comparison = {
        lastAcknowledgedAutosave: lastAutosave.draftPlainText,
        firstSyncAfterReload: null,
        tiptapAfterHydration: null,
        expectedFull: fullExpected,
      };

      if (!comparison.lastAcknowledgedAutosave.includes(fullExpected)) {
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-truncation-comparison.json",
          JSON.stringify({ scenarioLabel, comparison, collaborationEvents }, null, 2),
        );
        throw new Error(
          `${scenarioLabel}: truncation at last acknowledged autosave — expected "${fullExpected}", server draftPlainText="${comparison.lastAcknowledgedAutosave}"`,
        );
      }

      await page.waitForTimeout(2_000);
      await page.reload({ waitUntil: "domcontentloaded" });
      if (await page.getByText("couldn't load").count()) {
        throw new Error("Error boundary after reload");
      }

      const { editor: editorAfterReload, firstSyncAfterOpen: syncAfterReload } =
        await openEditorFromReadView(`${scenarioLabel}-after-reload`);
      comparison.firstSyncAfterReload = syncAfterReload?.draftPlainText ?? null;

      if (
        comparison.firstSyncAfterReload &&
        !comparison.firstSyncAfterReload.includes(fullExpected)
      ) {
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-truncation-comparison.json",
          JSON.stringify({ scenarioLabel, comparison, collaborationEvents }, null, 2),
        );
        throw new Error(
          `${scenarioLabel}: truncation at first sync after reload — expected "${fullExpected}", draftPlainText="${comparison.firstSyncAfterReload}"`,
        );
      }

      const hydrationDeadline = Date.now() + 60_000;
      let visibleAfterHydration = "";
      while (Date.now() < hydrationDeadline) {
        visibleAfterHydration = await editorPlainText(editorAfterReload);
        if (visibleAfterHydration.includes(fullExpected)) break;
        await page.waitForTimeout(400);
      }
      comparison.tiptapAfterHydration = visibleAfterHydration.trim();

      if (!comparison.tiptapAfterHydration.includes(fullExpected)) {
        writeFileSync(
          "/opt/cursor/artifacts/tenant-doc-truncation-comparison.json",
          JSON.stringify({ scenarioLabel, comparison, collaborationEvents }, null, 2),
        );
        throw new Error(
          `${scenarioLabel}: truncation in TipTap after hydration — expected "${fullExpected}", visible="${comparison.tiptapAfterHydration.slice(0, 200)}"`,
        );
      }

      return { scenarioLabel, pageUrl, comparison, firstSyncOnOpen: firstSyncAfterOpen?.draftPlainText };
    }

    const freshToken = `E2E-FRESH-${Date.now()}`;
    const freshResult = await runDraftPersistenceScenario(
      "fresh-page",
      fixture.pageId,
      freshToken,
      null,
    );

    const appendToken = `E2E-APPEND-${Date.now()}`;
    const existingResult = await runDraftPersistenceScenario(
      "existing-draft-page",
      fixture.pageId,
      appendToken,
      freshToken,
    );

    const yjsDup = pageErrors.find((e) => /Yjs was already imported/i.test(e));
    if (yjsDup) throw new Error(`Yjs duplicate import: ${yjsDup}`);
    if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);

    await browser.close();

    const report = {
      status: "PASS",
      fresh: freshResult,
      existing: existingResult,
    };
    writeFileSync(
      "/opt/cursor/artifacts/tenant-documentation-edit-browser-regression.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify({ status: "PASS", freshToken, existing: existingResult.comparison }));
    shutdown();
    process.removeAllListeners("SIGINT");
    process.exit(0);
  } catch (error) {
    shutdown();
    process.removeAllListeners("SIGINT");
    throw error;
  }
}

main().catch((err) => {
  console.error("[tenant-documentation-edit-browser-regression] FAILED:", err);
  process.exit(1);
});