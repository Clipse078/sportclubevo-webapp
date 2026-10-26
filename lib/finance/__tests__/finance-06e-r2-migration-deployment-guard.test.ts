/**
 * FIN-06E-R2 — Preview/STAGE migration + distribute permission guardrails.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_06E = "20261026160000_sce_finance_06e_publication_distribution";
const MIGRATION_R1 = "20261026173000_sce_finance_06e_r1_distribute_permission_backfill";

describe("FIN-06E-R2 migration deployment guard", () => {
  it("documents that Preview builds do not apply Prisma migrations", () => {
    const runbook = readFileSync(
      resolve(process.cwd(), "docs/deployment/stage-preview-migration-runbook.md"),
      "utf8",
    );
    expect(runbook).toContain("Preview builds **do not** apply migrations");
    expect(runbook).toContain("APPLY_DATABASE_MIGRATIONS");
    expect(runbook).toContain(MIGRATION_06E);
    expect(runbook).toContain(MIGRATION_R1);
    expect(runbook).toContain("finance.reporting.distribute");
  });

  it("provides a designated STAGE verify script for FIN-06E schema and R1 permission backfill", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/sce-finance-06e-r2-stage-migration-verify.ts"),
      "utf8",
    );
    expect(script).toContain(MIGRATION_06E);
    expect(script).toContain(MIGRATION_R1);
    expect(script).toContain("db:migrate:deploy-if-enabled");
    expect(script).toContain("FinancePublicationDistribution");
    expect(script).toContain("finance.reporting.distribute");
    expect(script).toContain("club_admin__fc-allschwil");
  });

  it("R1 migration backfills catalog and Club Admin RolePermission grants idempotently", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        `prisma/migrations/${MIGRATION_R1}/migration.sql`,
      ),
      "utf8",
    );
    expect(sql).toContain("'finance.reporting.distribute'");
    expect(sql).toContain("club_admin__%");
    expect(sql).toContain('ON CONFLICT ("key") DO NOTHING');
    expect(sql).toContain('ON CONFLICT ("roleId", "permissionId") DO NOTHING');
  });

  it("exposes npm script for operator STAGE verification", () => {
    const pkg = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(pkg).toContain("finance:06e:r2:stage-migration-verify");
  });
});
