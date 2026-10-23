/**
 * FIN-04A R1 — Preview/STAGE schema parity guardrails (repository conventions).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME =
  "20261023180000_sce_finance_04a_forecast_foundation";

describe("FIN-04A R1 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
    expect(runbook).toContain("APPLY_DATABASE_MIGRATIONS");
  });

  it("provides a designated STAGE verify/apply script for FIN-04A migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04a-r1-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("db:migrate:deploy-if-enabled");
    expect(script).toContain("FinanceForecast");
    expect(script).toContain("FinanceForecastVersionStatus");
  });
});
