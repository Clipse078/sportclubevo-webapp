/**
 * SCE shared writing engine — Aufgabe description browser regression (production build).
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  assertAuthenticatedWhiteEditionShell,
  captureFullViewportShellEvidence,
} from "./sce-white-edition-rendered-shell-assert.mjs";

const PORT = Number.parseInt(process.env.SCE_WRITING_AUFGABE_PORT ?? "3101", 10);
const BASE_URL =
  process.env.SCE_WRITING_AUFGABE_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
const TEST_DB = process.env.TEST_DATABASE_URL?.trim();
const USE_EXTERNAL_SERVER = process.env.SCE_WRITING_AUFGABE_EXTERNAL_SERVER === "1";
const BROWSER_ARGS = ["--disable-dev-shm-usage", "--no-sandbox"];
const SHA_LABEL = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim().slice(0, 12);

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
    SCE_OPERATION_AUTHORIZATION: "sce-writing-aufgabe-browser-regression",
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
  } catch {
    // port free
  }
}

function startProductionServer(env) {
  return spawn("npm", ["run", "start", "--", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function assertSharedTaskEditor(page) {
  const editorShell = page.getByTestId("task-description-editor");
  await editorShell.waitFor({ state: "visible", timeout: 120_000 });
  const profile = await editorShell.getAttribute("data-sce-writing-profile");
  const shared = await editorShell.getAttribute("data-sce-writing-engine");
  if (shared !== "true" || profile !== "task") {
    throw new Error(
      `Expected shared SceWritingEngine (task), got engine=${shared} profile=${profile}`,
    );
  }
  return page.locator('[data-testid="task-description-editor"] .ProseMirror');
}

async function exerciseEditorTyping(page, prose) {
  await prose.click();
  const token = `WRITING-${Date.now()}`;
  await page.keyboard.type(token, { delay: 10 });
  await page.keyboard.press("Control+z");
  const afterUndo = await prose.innerText();
  if (afterUndo.includes(token)) {
    throw new Error("Undo did not remove typed token");
  }
  await page.keyboard.press("Control+Shift+z");
  const afterRedo = await prose.innerText();
  if (!afterRedo.includes(token)) {
    throw new Error("Redo did not restore typed token");
  }

  const boldBtn = page.getByTitle("Fett (Strg+B)");
  await boldBtn.click();
  await page.keyboard.type(" bold", { delay: 8 });

  const text = await prose.innerText();
  if (!text.includes(token) || !text.includes("bold")) {
    throw new Error(`Description round-trip failed in editor: "${text.slice(0, 120)}"`);
  }
  const hasBold = await prose.evaluate(
    (el) => el.querySelector("strong")?.textContent?.includes("bold") ?? false,
  );
  if (!hasBold) {
    throw new Error("Bold formatting not present in ProseMirror DOM");
  }
  return { token, text };
}

async function main() {
  assertLocalTestDb(TEST_DB);
  const authSecret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!authSecret) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required");

  const fixtureStdout = execSync("npx tsx scripts/sce-writing-aufgabe-browser-fixture.ts", {
    env: fixtureProcessEnv(),
    encoding: "utf8",
  });
  const fixture = parseFixtureStdout(fixtureStdout);

  const serverEnv = {
    ...fixtureProcessEnv(),
    AUTH_SECRET: authSecret,
    NEXTAUTH_SECRET: authSecret,
    NEXTAUTH_URL: BASE_URL,
    APP_BASE_URL: BASE_URL,
    NODE_ENV: "production",
    SCE_WHITE_EDITION: process.env.SCE_WHITE_EDITION ?? "1",
  };

  let server = null;
  let serverExited = false;
  if (!USE_EXTERNAL_SERVER) {
    releasePort(PORT);
    server = startProductionServer(serverEnv);
    server.on("exit", () => {
      serverExited = true;
    });
  }

  const shutdown = () => {
    if (server) {
      try {
        if (!serverExited) server.kill("SIGKILL");
      } catch {
        //
      }
    }
    if (!USE_EXTERNAL_SERVER) {
      releasePort(PORT);
    }
  };
  process.on("SIGINT", shutdown);

  try {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 180_000;
      const tick = () => {
        if (serverExited) {
          reject(new Error("Production server exited before ready"));
          return;
        }
        fetch(`${BASE_URL}/login`)
          .then((res) => {
            if (res.ok || res.status === 307 || res.status === 308) resolve(null);
            else if (Date.now() > deadline) reject(new Error("Server readiness timeout"));
            else setTimeout(tick, 500);
          })
          .catch(() => {
            if (Date.now() > deadline) reject(new Error("Server readiness timeout"));
            else setTimeout(tick, 500);
          });
      };
      tick();
    });

    const browser = await chromium.launch({ args: BROWSER_ARGS });
    const page = await browser.newPage();
    await login(page, fixture.email, fixture.password);

    await page.goto(`${BASE_URL}/dashboard/aufgaben/neu`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await assertAuthenticatedWhiteEditionShell(page, { label: "aufgabe-neu" });

    const proseCreate = await assertSharedTaskEditor(page);
    await proseCreate.waitFor({ state: "visible", timeout: 60_000 });
    const createTyping = await exerciseEditorTyping(page, proseCreate);
    const createTitle = `Writing E2E ${Date.now()}`;
    await page.locator('input[name="title"]').fill(createTitle);
    await page.getByTestId("aufgaben-full-create-submit").click();
    await page.waitForURL(/\/dashboard\/aufgaben\/(?!neu)[^/?#]+$/, { timeout: 120_000 });
    const createdTaskUrl = page.url();
    const createdTaskId = createdTaskUrl.split("/").pop();
    const descriptionOpenCreated = page.getByTestId("task-workspace-description");
    await descriptionOpenCreated.waitFor({ state: "visible", timeout: 60_000 });
    const createdDescriptionPreview = await descriptionOpenCreated.innerText();
    if (!createdDescriptionPreview.includes(createTyping.token) || !createdDescriptionPreview.includes("bold")) {
      throw new Error(
        `Created task description missing undo/redo/bold round-trip: "${createdDescriptionPreview.slice(0, 200)}"`,
      );
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await descriptionOpenCreated.waitFor({ state: "visible", timeout: 60_000 });
    const afterReloadPreview = await descriptionOpenCreated.innerText();
    if (!afterReloadPreview.includes(createTyping.token)) {
      throw new Error(`Created task description lost after reload: "${afterReloadPreview.slice(0, 200)}"`);
    }

    await page.goto(`${BASE_URL}/dashboard/aufgaben/neu`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await assertAuthenticatedWhiteEditionShell(page, { label: "aufgabe-neu-screenshot" });
    const proseCreateShot = await assertSharedTaskEditor(page);
    await proseCreateShot.waitFor({ state: "visible", timeout: 60_000 });

    await captureFullViewportShellEvidence(
      page,
      `/opt/cursor/artifacts/aufgabe-create-${SHA_LABEL}-1440.png`,
    );

    await page.goto(`${BASE_URL}/dashboard/aufgaben/${fixture.existingTaskId}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await assertAuthenticatedWhiteEditionShell(page, { label: "aufgabe-edit" });

    const descriptionOpen = page.getByTestId("task-workspace-description");
    await descriptionOpen.waitFor({ state: "visible", timeout: 60_000 });
    await descriptionOpen.click();

    const proseEdit = await assertSharedTaskEditor(page);
    await proseEdit.waitFor({ state: "visible", timeout: 60_000 });
    const editPre = await proseEdit.innerText();
    if (!editPre.includes("Fixture seed")) {
      throw new Error(`Existing description not hydrated: "${editPre.slice(0, 160)}"`);
    }
  if (!editPre.includes("bold")) {
      throw new Error("Existing bold content missing after hydration");
    }

    await proseEdit.click();
    await page.keyboard.press("End");
    const append = ` APPEND-${Date.now()}`;
    await page.keyboard.type(append, { delay: 8 });
    const editPost = await proseEdit.innerText();
    if (!editPost.includes(append.trim())) {
      throw new Error("Append edit failed on existing task");
    }
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await descriptionOpen.waitFor({ state: "visible", timeout: 60_000 });
    await descriptionOpen.click();
    const proseReopen = await assertSharedTaskEditor(page);
    const reopenedText = await proseReopen.innerText();
    if (!reopenedText.includes("Fixture seed") || !reopenedText.includes(append.trim())) {
      throw new Error(`Edit save/reopen failed: "${reopenedText.slice(0, 200)}"`);
    }
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(800);

    await captureFullViewportShellEvidence(
      page,
      `/opt/cursor/artifacts/aufgabe-edit-${SHA_LABEL}-1440.png`,
    );

    await browser.close();

    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const report = {
      status: "PASS",
      testedSha: sha,
      profile: "task",
      sceWhiteEdition: serverEnv.SCE_WHITE_EDITION,
      whiteEditionShellAsserted: true,
      surfaces: ["aufgabe-create", "aufgabe-edit"],
      createTyping,
      createdTaskId,
      createSaveReopen: { title: createTitle, afterReloadPreview: afterReloadPreview.slice(0, 120) },
      editSaveReopen: { append: append.trim() },
    };
    writeFileSync("/opt/cursor/artifacts/sce-writing-aufgabe-browser-regression.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    shutdown();
    process.exit(0);
  } catch (error) {
    shutdown();
    throw error;
  }
}

main().catch((err) => {
  console.error("[sce-writing-aufgabe-browser-regression] FAILED:", err);
  process.exit(1);
});