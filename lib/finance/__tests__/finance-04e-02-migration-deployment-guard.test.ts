/**
 * FIN-04E-02 — migration guard; STAGE apply deferred until PO UAT needs persistence.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261024200000_sce_finance_04e_02_expected_event_persistence";

describe("FIN-04E-02 migration deployment guard", () => {
  it("provides a guarded STAGE verifier script for FIN-04E-02", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04e-02-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("assertDesignatedStage");
    expect(script).toContain("db:migrate:deploy-if-enabled");
  });

  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
  });

  it("creates expected event table without rewriting existing finance data", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("FinanceExpectedFinancialEvent");
    expect(sql).toContain("ON DELETE RESTRICT");
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/UPDATE\s+"FinanceScenario"/i);
  });
});
