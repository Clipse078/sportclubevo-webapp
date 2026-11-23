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
import {
  assertAuthenticatedWhiteEditionShell,
  captureFullViewportShellEvidence,
} from "./sce-white-edition-rendered-shell-assert.mjs";
import { exerciseSceWritingInsertMenu } from "./sce-writing-insert-menu-browser-probe.mjs";

const PORT = Number.parseInt(process.env.TENANT_DOC_BROWSER_PORT ?? "3099", 10);
const BASE_URL =
  process.env.TENANT_DOC_BROWSER_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
const TEST_DB = process.env.TEST_DATABASE_URL?.trim();
const USE_EXTERNAL_SERVER = process.env.TENANT_DOC_BROWSER_EXTERNAL_SERVER === "1";
const BROWSER_ARGS = ["--disable-dev-shm-usage", "--no-sandbox"];

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

const LAYOUT_JUMP_MAX_PX = 12;

async function boundingBoxOrNull(locator) {
  try {
    return await locator.boundingBox();
  } catch {
    return null;
  }
}

async function pasteHtmlIntoEditor(page, editor, html, plain) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(
    async ({ html: htmlPayload, plain: plainPayload }) => {
      const htmlBlob = new Blob([htmlPayload], { type: "text/html" });
      const plainBlob = new Blob([plainPayload], { type: "text/plain" });
      const item = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": plainBlob,
      });
      await navigator.clipboard.write([item]);
    },
    { html, plain },
  );
  await editor.click();
  await page.keyboard.press("Control+v");
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
    SCE_WHITE_EDITION: process.env.SCE_WHITE_EDITION ?? "1",
  };
  let server = null;
  const serverLog = [];
  if (!USE_EXTERNAL_SERVER) {
    server = startProductionServer(serverEnv);
    server.stdout?.on("data", (c) => serverLog.push(String(c)));
    server.stderr?.on("data", (c) => serverLog.push(String(c)));
    server.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        serverLog.push(`\n[server exited code=${code} signal=${signal ?? ""}]\n`);
      }
    });
  }

  const shutdown = () => {
    if (server) {
      try {
        server.kill("SIGKILL");
      } catch {
        //
      }
    }
    if (!USE_EXTERNAL_SERVER) {
      releasePort(PORT);
    }
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

    const browser = await chromium.launch({ args: BROWSER_ARGS });
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
    await assertAuthenticatedWhiteEditionShell(page, {
      label: "dokumentation-dashboard",
    });

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
      const whiteSurface = page.getByTestId("tenant-documentation-white-surface");
      const layoutBefore = await boundingBoxOrNull(whiteSurface);
      const eventsBefore = collaborationEvents.length;
      await btn.click({ timeout: 60_000 });
      const mountShell = page.getByTestId("tenant-doc-collab-editor-mount-shell");
      const layoutAfterClick = await boundingBoxOrNull(mountShell);
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
      const engineShell = page.getByTestId("tenant-doc-collab-editor");
      await engineShell.waitFor({ state: "visible", timeout: 120_000 });
      const profile = await engineShell.getAttribute("data-sce-writing-profile");
      const shared = await engineShell.getAttribute("data-sce-writing-engine");
      if (shared !== "true" || profile !== "documentation") {
        throw new Error(
          `Expected shared SceWritingEngine (documentation), got engine=${shared} profile=${profile}`,
        );
      }
      await assertAuthenticatedWhiteEditionShell(page, {
        label: `dokumentation-edit-${label}`,
        allowDocumentationWhiteSurface: true,
      });
      const editor = page.locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror');
      await editor.waitFor({ state: "visible", timeout: 120_000 });
      const editorShell = page.getByTestId("tenant-doc-collab-editor");
      const layoutAfterHydration = await boundingBoxOrNull(editorShell);
      const layoutJump = { label, layoutBefore, layoutAfterClick, layoutAfterHydration };
      if (layoutAfterClick && layoutAfterHydration) {
        const topDelta = Math.abs(layoutAfterClick.y - layoutAfterHydration.y);
        const heightDelta = Math.abs(layoutAfterClick.height - layoutAfterHydration.height);
        layoutJump.topDeltaPx = topDelta;
        layoutJump.heightDeltaPx = heightDelta;
        if (topDelta > LAYOUT_JUMP_MAX_PX) {
          throw new Error(
            `[${label}] Bearbeiten hydration vertical jump ${topDelta}px exceeds ${LAYOUT_JUMP_MAX_PX}px`,
          );
        }
      }
      return { editor, firstSyncAfterOpen, label, layoutJump };
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

    const coEditTokenA = `COEDIT-A-${Date.now()}`;
    const coEditTokenB = `COEDIT-B-${Date.now()}`;
    collaborationEvents.length = 0;
    await openReadDetail(fixture.pageId);
    const { editor: editorA } = await openEditorFromReadView("coedit-user-a");
    await typeInEditor(editorA, coEditTokenA);
    await waitForAutosaved();

    const pageB = await browser.newPage();
    pageB.on("pageerror", (err) => pageErrors.push(`[B] ${String(err)}`));
    await login(pageB, fixture.secondEmail, fixture.secondPassword);
    const pageUrlB = `${BASE_URL}/dashboard/dokumentation/p/${fixture.pageId}`;
    await pageB.goto(pageUrlB, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await pageB.getByRole("button", { name: /Bearbeiten/i }).click();
    const editorB = pageB.locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror');
    await editorB.waitFor({ state: "visible", timeout: 120_000 });
    const syncDeadline = Date.now() + 60_000;
    let visibleB = "";
    while (Date.now() < syncDeadline) {
      visibleB = await editorPlainText(editorB);
      if (visibleB.includes(coEditTokenA)) break;
      await pageB.waitForTimeout(400);
    }
    if (!visibleB.includes(coEditTokenA)) {
      throw new Error(`Co-editor B did not receive A's draft: "${visibleB.slice(0, 200)}"`);
    }
    await editorB.click();
    await pageB.keyboard.press("End");
    await pageB.keyboard.type(coEditTokenB, { delay: 10 });
    await pageB.getByTestId("tenant-doc-save-status").getByText(/gespeichert/i).waitFor({
      timeout: 90_000,
    });
  const syncDeadlineA = Date.now() + 60_000;
    let visibleA = "";
    while (Date.now() < syncDeadlineA) {
      visibleA = await editorPlainText(editorA);
      if (visibleA.includes(coEditTokenB)) break;
      await page.waitForTimeout(400);
    }
    if (!visibleA.includes(coEditTokenB)) {
      throw new Error(`Co-editor A did not receive B's edit: "${visibleA.slice(0, 200)}"`);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    const { editor: editorAfterCoReload } = await openEditorFromReadView("coedit-after-reload");
    const reloaded = await editorPlainText(editorAfterCoReload);
    if (!reloaded.includes(coEditTokenA) || !reloaded.includes(coEditTokenB)) {
      throw new Error(`Co-edit draft lost after reload: "${reloaded.slice(0, 200)}"`);
    }
    await pageB.reload({ waitUntil: "domcontentloaded" });
    await pageB.getByRole("button", { name: /Bearbeiten/i }).click();
    await editorB.waitFor({ state: "visible", timeout: 120_000 });
    const reloadedB = await editorPlainText(editorB);
    if (!reloadedB.includes(coEditTokenA) || !reloadedB.includes(coEditTokenB)) {
      throw new Error(`Co-edit draft lost for B after reload: "${reloadedB.slice(0, 200)}"`);
    }
    await pageB.close();

    const richTextToken = "RichPasteWord";
    collaborationEvents.length = 0;
    await openReadDetail(fixture.pageId);
    const { editor: richEditor } = await openEditorFromReadView("rich-text");
    const insertMenu = await exerciseSceWritingInsertMenu(page, richEditor, {
      selectItemId: "heading-2",
      filterText: "über",
    });
    await waitForAutosaved();
    const insertMenuHeading = await richEditor.evaluate((el) => !!el.querySelector("h2"));
    if (!insertMenuHeading) throw new Error("Insert menu heading 2 missing before rich-text scenario");
    await page.reload({ waitUntil: "domcontentloaded" });
    const { editor: richAfterInsertReload } = await openEditorFromReadView("insert-menu-reload");
    const insertReloadHasHeading = await richAfterInsertReload.evaluate((el) => !!el.querySelector("h2"));
    if (!insertReloadHasHeading) throw new Error("Insert menu heading lost after reload");
    const wordHtml = `<!--[if gte mso 9]><![endif]--><p class="MsoNormal" style="mso-margin-top-alt:auto">${richTextToken}</p>`;
    await pasteHtmlIntoEditor(page, richEditor, wordHtml, richTextToken);
    await page.getByTitle("Aufzählung").click();
    await page.keyboard.type(" List item one", { delay: 8 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("List item two", { delay: 8 });
    const hasBullet = await richEditor.evaluate(
      (el) => el.querySelector("ul li") !== null,
    );
    if (!hasBullet) throw new Error("Bullet list not present after toolbar toggle");
    await page.keyboard.press("Control+End");
    const linkAnchor = " E2E anchor";
    await page.keyboard.type(linkAnchor, { delay: 8 });
    for (let i = 0; i < linkAnchor.length; i += 1) {
      await page.keyboard.press("Shift+ArrowLeft");
    }
    page.once("dialog", async (dialog) => {
      await dialog.accept("https://example.com/sce-writing-e2e");
    });
    await page.keyboard.press("Control+k");
    await waitForAutosaved();
    const hasLink = await richEditor.evaluate(
      (el) => el.querySelector('a[href="https://example.com/sce-writing-e2e"]') !== null,
    );
    if (!hasLink) throw new Error("Link not present after Strg+K");
    await page.reload({ waitUntil: "domcontentloaded" });
    const { editor: richAfterReload } = await openEditorFromReadView("rich-text-reload");
    const richPlain = await editorPlainText(richAfterReload);
    if (!richPlain.includes(richTextToken) || !richPlain.includes("List item one")) {
      throw new Error(`Rich text lost after reload: "${richPlain.slice(0, 240)}"`);
    }
    const richFormatting = {
      coEdit: { coEditTokenA, coEditTokenB, reloaded: true },
      insertMenu: { ...insertMenu, insertReloadHasHeading },
      pasteListLink: { richTextToken, hasBullet, hasLink, richPlainSnippet: richPlain.slice(0, 120) },
    };

    const yjsDup = pageErrors.find((e) => /Yjs was already imported/i.test(e));
    if (yjsDup) throw new Error(`Yjs duplicate import: ${yjsDup}`);
    if (pageErrors.length > 0) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);

    const shaLabel = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim().slice(0, 12);
    await page.goto(`${BASE_URL}/dashboard/dokumentation/p/${fixture.pageId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByRole("button", { name: /Bearbeiten/i }).click();
    await page
      .locator('[data-testid="tenant-doc-collab-editor"] .ProseMirror')
      .waitFor({ state: "visible", timeout: 120_000 });
    await assertAuthenticatedWhiteEditionShell(page, {
      label: "dokumentation-edit-screenshot",
      allowDocumentationWhiteSurface: true,
    });
    await captureFullViewportShellEvidence(
      page,
      `/opt/cursor/artifacts/dokumentation-edit-${shaLabel}-1440.png`,
    );

    await browser.close();

    const report = {
      status: "PASS",
      testedSha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
      sceWhiteEdition: serverEnv.SCE_WHITE_EDITION,
      whiteEditionShellAsserted: true,
      fresh: freshResult,
      existing: existingResult,
      richFormatting,
      layoutJumpMaxPx: LAYOUT_JUMP_MAX_PX,
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