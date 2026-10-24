import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261024180000_sce_finance_04d_06_scenario_adoption_rebase";

describe("FIN-04D-06 migration deployment guard", () => {
  it("provides a designated STAGE verify script", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04d-06-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("FinanceScenarioAdoption");
    expect(script).toContain("FinanceScenarioRebase");
    expect(script).toContain("APPLY_DATABASE_MIGRATIONS");
    expect(script).toContain("existingFinancePreserved");
  });

  it("adds adoption audit tables without rewriting scenario data", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("SCENARIO_ADOPTION");
    expect(sql).toContain("ON DELETE RESTRICT");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceScenario"/i);
  });
});
