/**
 * Deployment preflight runner.
 *
 * Integrated into the build pipeline via:
 *   npm run deployment:preflight
 *
 * Exits 0 when no errors are detected.
 * Exits 1 when one or more errors are detected, blocking the deployment.
 *
 * In local/test environments warnings are emitted but the process always
 * exits 0 so ordinary development is not disrupted.
 */

import "dotenv/config";

import { runDeploymentPreflight } from "@/lib/server/deployment-preflight";

const result = runDeploymentPreflight(process.env);

const errors = result.violations.filter((v) => v.severity === "error");
const warnings = result.violations.filter((v) => v.severity === "warning");

if (warnings.length > 0) {
  console.warn("\n[preflight] WARNINGS:");
  for (const w of warnings) {
    console.warn(`  [${w.code}] ${w.message}`);
  }
}

if (errors.length > 0) {
  console.error("\n[preflight] ERRORS — deployment blocked:");
  for (const e of errors) {
    console.error(`  [${e.code}] ${e.message}`);
  }
  console.error("\n[preflight] FAIL — fix the above errors before deploying.\n");
  process.exit(1);
}

console.log(
  `[preflight] PASS${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ""}.`,
);
process.exit(0);
