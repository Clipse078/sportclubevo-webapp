/**
 * SCE shared writing engine — Aufgabe description browser regression (production build).
 */
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = Number.parseInt(process.env.SCE_WRITING_AUFGABE_PORT ?? "3101", 10);
const BASE_URL =
  process.env.SCE_WRITING_AUFGABE_BASE_URL?.trim() || `http://127.0.0.1:${PORT}`;
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

function startProductionServer(env) {
  return spawn("npm", ["run", "start", "--", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, ...env, PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
  });
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
  };

  const server = startProductionServer(serverEnv);
  let serverExited = false;
  server.on("exit", () => {
    serverExited = true;
  });

  const shutdown = () => {
    if (!serverExited) server.kill("SIGTERM");
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

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await login(page, fixture.email, fixture.password);

    await page.goto(`${BASE_URL}/dashboard/aufgaben/neu`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });

    const editorShell = page.getByTestId("task-description-editor");
    await editorShell.waitFor({ state: "visible", timeout: 120_000 });
    const profile = await editorShell.getAttribute("data-sce-writing-profile");
    const shared = await editorShell.getAttribute("data-sce-writing-engine");
    if (shared !== "true" || profile !== "task") {
      throw new Error(
        `Expected shared SceWritingEngine (task), got engine=${shared} profile=${profile}`,
      );
    }

    const prose = page.locator('[data-testid="task-description-editor"] .ProseMirror');
    await prose.waitFor({ state: "visible", timeout: 60_000 });
    await prose.click();
    const token = `WRITING-${Date.now()}`;
    await page.keyboard.type(token, { delay: 10 });
    await page.keyboard.press("Control+z");
    await page.keyboard.type(token, { delay: 10 });

    const boldBtn = page.getByTitle("Fett (Strg+B)");
    await boldBtn.click();
    await page.keyboard.type(" bold", { delay: 8 });

    const text = await prose.innerText();
    if (!text.includes(token) || !text.includes("bold")) {
      throw new Error(`Description round-trip failed in editor: "${text.slice(0, 120)}"`);
    }

    await browser.close();

    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const report = {
      status: "PASS",
      testedSha: sha,
      profile: "task",
      surfaces: ["aufgabe"],
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