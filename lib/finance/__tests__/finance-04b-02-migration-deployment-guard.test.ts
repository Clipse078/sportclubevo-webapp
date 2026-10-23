/**
 * FIN-04B-02 — migration committed; shared STAGE apply deferred to readiness package.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_NAME = "20261023200000_sce_finance_04b_02_projection_persistence";

describe("FIN-04B-02 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
  });

  it("provides a designated STAGE verify script for FIN-04B-02 migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-04b-02-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("FinanceProjection");
    expect(script).toContain("BROKEN_CURRENT_PROJECTION_POINTERS");
    expect(script).toContain("INVALID_PROJECTION_RANGES");
  });

  it("includes range integrity CHECK in migration SQL", () => {
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("FinanceProjectionLine_range_integrity_check");
    expect(sql).toContain('CREATE TYPE "FinanceProjectionDataSufficiency"');
  });
});
