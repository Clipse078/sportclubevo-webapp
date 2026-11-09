/**
 * Install Playwright Chromium in CI before design-system tests (Linux OS deps).
 */
import { execSync } from "node:child_process";

if (process.env.CI !== "true") {
  process.exit(0);
}

const withDeps = process.platform === "linux" ? "--with-deps " : "";
execSync(`npx playwright install ${withDeps}chromium`, { stdio: "inherit" });
