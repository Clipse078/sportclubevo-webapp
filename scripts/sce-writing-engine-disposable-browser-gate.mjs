/**
 * SCE shared writing engine — disposable browser gate (Dokumentation + Aufgabe).
 *
 *   TEST_DATABASE_URL=postgresql://... AUTH_SECRET=... npm run sce-writing:disposable-browser-gate
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const TEST_DB = process.env.TEST_DATABASE_URL?.trim();
const authSecret =
  process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

if (!TEST_DB) throw new Error("TEST_DATABASE_URL required");
if (!authSecret) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET required");

const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

const baseEnv = {
  ...process.env,
  TEST_DATABASE_URL: TEST_DB,
  DATABASE_URL: TEST_DB,
  DIRECT_URL: TEST_DB,
  AUTH_SECRET: authSecret,
  NEXTAUTH_SECRET: authSecret,
  SCE_DATA_ENVIRONMENT: "LOCAL",
  /** Mirror STAGE White Edition — disposable gates must fail on legacy blue canvas. */
  SCE_WHITE_EDITION: "1",
};

if (process.env.SCE_WRITING_BROWSER_SKIP_BUILD !== "1") {
  execSync("npm run build", { stdio: "inherit", env: baseEnv });
}

execSync("node scripts/tenant-documentation-edit-browser-regression.mjs", {
  stdio: "inherit",
  env: {
    ...baseEnv,
    TENANT_DOC_BROWSER_SKIP_BUILD: "1",
    TENANT_DOC_BROWSER_SKIP_MIGRATE: process.env.TENANT_DOC_BROWSER_SKIP_MIGRATE ?? "1",
  },
});

execSync("node scripts/sce-writing-aufgabe-browser-regression.mjs", {
  stdio: "inherit",
  env: {
    ...baseEnv,
    SCE_WRITING_BROWSER_SKIP_BUILD: "1",
  },
});

const report = {
  status: "PASS",
  testedSha: sha,
  sceWhiteEdition: "1",
  whiteEditionShellAsserted: true,
  waveOne: ["dokumentation", "aufgabe"],
  rolloutOrder: [
    "dokumentation",
    "aufgabe",
    "strategie-ziel-beschreibung",
    "cms-news-blocks",
    "personal-signature",
    "meeting-documentation",
  ],
};
writeFileSync(
  "/opt/cursor/artifacts/sce-writing-engine-disposable-browser-gate.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));