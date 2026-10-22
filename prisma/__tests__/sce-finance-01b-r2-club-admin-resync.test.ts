import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("SCE-FINANCE-01B-R2 club admin catalog resync migration", () => {
  const migrationDir = join(
    process.cwd(),
    "prisma/migrations/20261022160000_sce_finance_01b_r2_club_admin_delegatable_catalog_resync",
  );
  const sql = readFileSync(join(migrationDir, "migration.sql"), "utf8");

  it("uses catalog-driven TENANT grantableByAdmin alignment for canonical Club Admin roles", () => {
    expect(sql).toContain(`r."key" LIKE 'club_admin__%'`);
    expect(sql).toContain(`p."scope" = 'TENANT'`);
    expect(sql).toContain(`p."grantableByAdmin" = true`);
    expect(sql).toContain("ON CONFLICT");
  });

  it("does not hardcode finance permission keys (catalog-driven)", () => {
    expect(sql).not.toContain("'finance.view'");
  });
});
