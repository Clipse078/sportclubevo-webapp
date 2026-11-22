#!/usr/bin/env node
/**
 * PR #1025 — run disposable gate legs in separate processes (integration → build → edit → lifecycle).
 */
import { execSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import crypto from "node:crypto";

const repoRoot = process.cwd();
const sha = process.env.TENANT_DOC_GATE_SHA?.trim() || execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const authSecret =
  process.env.AUTH_SECRET?.trim() ||
  process.env.NEXTAUTH_SECRET?.trim() ||
  crypto.randomBytes(32).toString("hex");

function run(cmd, env = {}) {
  execSync(cmd, {
    stdio: "inherit",
    cwd: repoRoot,
    env: { ...process.env, ...env },
  });
}

console.log(JSON.stringify({ leg: "start", sha, at: new Date().toISOString() }));

run(`npx tsx scripts/sce-tenant-documentation-disposable-integration-gate.ts`, {
  AUTH_SECRET: authSecret,
  NEXTAUTH_SECRET: authSecret,
});

const disposableFile = "/opt/cursor/artifacts/tenant-doc-disposable-database.url";
const testDb = execSync(`tr -d '\\n' < ${disposableFile}`, { encoding: "utf8" });

run("npm run build", {
  AUTH_SECRET: authSecret,
  NEXTAUTH_SECRET: authSecret,
  TEST_DATABASE_URL: testDb,
  DATABASE_URL: testDb,
  DIRECT_URL: testDb,
});

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
    if (out) execSync("sleep 2");
  } catch {
    //
  }
}

const editPort = process.env.TENANT_DOC_EDIT_BROWSER_PORT || "3221";
releasePort(editPort);
const editRun = spawnSync(
  process.execPath,
  [`${repoRoot}/scripts/tenant-documentation-edit-browser-regression.mjs`],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_SECRET: authSecret,
      NEXTAUTH_SECRET: authSecret,
      TEST_DATABASE_URL: testDb,
      DATABASE_URL: testDb,
      DIRECT_URL: testDb,
      TENANT_DOC_BROWSER_SKIP_BUILD: "1",
      TENANT_DOC_BROWSER_SKIP_MIGRATE: "1",
      TENANT_DOC_BROWSER_PORT: editPort,
      NEXTAUTH_URL: `http://127.0.0.1:${editPort}`,
      AUTH_URL: `http://127.0.0.1:${editPort}`,
      TENANT_DOC_GATE_SHA: sha,
    },
  },
);
if (editRun.status !== 0) process.exit(editRun.status ?? 1);

const lifePort = process.env.TENANT_DOC_LIFECYCLE_BROWSER_PORT || "3220";
releasePort(lifePort);
releasePort(editPort);
const lifeRun = spawnSync(
  process.execPath,
  [`${repoRoot}/scripts/tenant-documentation-lifecycle-browser-regression.mjs`],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      AUTH_SECRET: authSecret,
      NEXTAUTH_SECRET: authSecret,
      TEST_DATABASE_URL: testDb,
      DATABASE_URL: testDb,
      DIRECT_URL: testDb,
      TENANT_DOC_BROWSER_SKIP_BUILD: "1",
      TENANT_DOC_BROWSER_SKIP_MIGRATE: "1",
      TENANT_DOC_BROWSER_PORT: lifePort,
      NEXTAUTH_URL: `http://127.0.0.1:${lifePort}`,
      AUTH_URL: `http://127.0.0.1:${lifePort}`,
      NODE_OPTIONS: "--max-old-space-size=8192",
      TENANT_DOC_GATE_SHA: sha,
    },
  },
);
if (lifeRun.status !== 0) process.exit(lifeRun.status ?? 1);

writeFileSync(
  "/opt/cursor/artifacts/tenant-documentation-disposable-gate-legs.json",
  JSON.stringify({ status: "PASS", sha, testDatabase: "local-disposable", verifiedAt: new Date().toISOString() }, null, 2),
);
console.log(JSON.stringify({ status: "PASS", sha }));