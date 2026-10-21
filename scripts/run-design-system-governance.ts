#!/usr/bin/env tsx
/**
 * SCE Design System governance CLI (DS-11).
 * Exits non-zero when static governance violations are detected.
 */

import {
  formatSceGovernanceViolationsForCli,
  runSceDesignSystemGovernance,
} from "@/lib/design-system/sce-design-system-governance-runner";

const result = runSceDesignSystemGovernance();

console.log(
  [
    "[sce-design-system-governance]",
    `filesScanned=${result.filesScanned}`,
    `ruleCount=${result.ruleCount}`,
    `durationMs=${result.durationMs}`,
    `exceptions=${result.metrics.exceptionRegistryEntries}`,
    `pass=${result.pass ? "YES" : "NO"}`,
  ].join(" "),
);

if (!result.pass) {
  console.error("\n[sce-design-system-governance] FAIL\n");
  console.error(formatSceGovernanceViolationsForCli(result.violations));
  process.exit(1);
}

console.log("[sce-design-system-governance] PASS");
process.exit(0);
