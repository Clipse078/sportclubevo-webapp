/**
 * FIN-04D-02 — migration guard; shared STAGE apply via stage verify script.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261024160000_sce_finance_04d_02_scenario_persistence";

describe("FIN-04D-02 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
  });

  it("provides a designated STAGE verify script for FIN-04D-02 migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04d-02-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("FinanceScenario");
    expect(script).toContain("FinanceScenarioAssumption");
    expect(script).toContain("APPLY_DATABASE_MIGRATIONS");
  });

  it("adds scenario tables without legacy forecast rewrite", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE \"FinanceScenario\"");
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecast"/i);
  });
});
