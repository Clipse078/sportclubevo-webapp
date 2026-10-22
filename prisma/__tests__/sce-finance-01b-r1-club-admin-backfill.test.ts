import fs from "node:fs";
import path from "node:path";

describe("SCE-FINANCE-01B-R1 Club Admin finance permission backfill", () => {
  const migrationPath = path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20261022140000_sce_finance_01b_r1_club_admin_permission_backfill",
    "migration.sql",
  );

  const sql = fs.readFileSync(migrationPath, "utf8");

  const expectedPermissions = [
    "finance.view",
    "finance.structure.manage",
    "finance.admin",
  ];

  it("materializes RolePermission rows", () => {
    expect(sql).toContain('INSERT INTO "RolePermission"');
  });

  it("targets only tenant Club Admin roles", () => {
    expect(sql).toContain(`r."key" LIKE 'club_admin__%'`);
  });

  it("includes all FIN-01B organisation finance permissions", () => {
    for (const permission of expectedPermissions) {
      expect(sql).toContain(`'${permission}'`);
    }
  });

  it("does not grant finance access to non-club-admin roles", () => {
    expect(sql).not.toContain(`LIKE 'trainer'`);
    expect(sql).not.toContain(`'people.view'`);
  });

  it("is idempotent", () => {
    expect(sql).toContain('ON CONFLICT ("roleId", "permissionId") DO NOTHING');
  });
});
