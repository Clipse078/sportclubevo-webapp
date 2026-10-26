/**
 * FIN-07A — migration guard; STAGE apply deferred until PO UAT needs persistence.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261026220000_sce_finance_07a_commitment_foundation";

describe("FIN-07A migration deployment guard", () => {
  it("provides a guarded STAGE verifier script for FIN-07A", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-07a-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("assertDesignatedStage");
  });

  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
  });

  it("creates commitment tables without rewriting existing finance data", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("FinanceCommitment");
    expect(sql).toContain("FinanceEconomicEvidenceLink");
    expect(sql).toContain("'COMMITMENT'");
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/UPDATE\s+"FinanceBudget"/i);
  });
});
