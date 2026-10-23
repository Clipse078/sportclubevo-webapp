/**
 * FIN-03A R1 — Preview/STAGE schema parity guardrails (repository conventions).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME =
  "20261023120000_sce_finance_03a_actuals_foundation";

describe("FIN-03A R1 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
    expect(runbook).toContain("APPLY_DATABASE_MIGRATIONS");
  });

  it("provides a designated STAGE verify/apply script for FIN-03A migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-03a-r1-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("db:migrate:deploy-if-enabled");
    expect(script).toContain("FinanceActualEntry");
    expect(script).toContain("FinanceActualEntrySource");
  });
});
