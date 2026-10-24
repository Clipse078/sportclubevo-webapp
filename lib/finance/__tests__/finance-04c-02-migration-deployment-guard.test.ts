/**
 * FIN-04C-02 — migration guard; shared STAGE apply via stage verify script.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261024120000_sce_finance_04c_02_forecast_revision_lifecycle";

describe("FIN-04C-02 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
  });

  it("provides a designated STAGE verify script for FIN-04C-02 migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04c-02-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("FinanceForecastVersion");
    expect(script).toContain("revisionSource");
    expect(script).toContain("APPLY_DATABASE_MIGRATIONS");
    expect(script).toContain("existingFinancePreserved");
  });

  it("adds revision metadata columns without legacy backfill", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain('"FinanceForecastRevisionSource"');
    expect(sql).toContain('"previousVersionId"');
    expect(sql).toContain("ON DELETE RESTRICT");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecastVersion"/i);
  });
});
