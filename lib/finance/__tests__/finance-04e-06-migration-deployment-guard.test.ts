import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261025120000_sce_finance_04e_06_scenario_assumption_effective_from";

describe("FIN-04E-06 migration deployment guard", () => {
  it("adds optional effectiveFromDate without rewriting finance data", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("effectiveFromDate");
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/UPDATE\s+"FinanceScenarioAssumption"/i);
    expect(sql).not.toMatch(/UPDATE\s+"FinanceExpectedFinancialEvent"/i);
  });
});
