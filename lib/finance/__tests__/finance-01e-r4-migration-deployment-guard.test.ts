/**
 * FIN-01E R4 — Preview/STAGE schema parity guardrails (repository conventions).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const R3_MIGRATION =
  "20261022200000_sce_finance_01e_r3_budget_version_base_currency";

describe("FIN-01E R4 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
    expect(runbook).toContain("APPLY_DATABASE_MIGRATIONS");
    expect(runbook).toContain(R3_MIGRATION);
  });

  it("provides a designated STAGE verify/apply script for FIN-01E R3 migration", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-01e-r4-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_NAME);
    expect(script).toContain("db:migrate:deploy-if-enabled");
    expect(script).toContain("baseCurrency");
  });

  it("FIN-01E implementation doc records STAGE migration prerequisite before PO UAT", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-01E-IMPLEMENTATION.md"),
      "utf8",
    );
    expect(doc).toContain("stage-preview-migration-runbook");
    expect(doc).toContain(R3_MIGRATION);
    expect(doc).toMatch(/R4|schema parity|STAGE migration/i);
  });
});

const MIGRATION_NAME = R3_MIGRATION;
