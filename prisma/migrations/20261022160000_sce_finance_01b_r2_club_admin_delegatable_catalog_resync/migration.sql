-- SCE-FINANCE-01B-R2
--
-- Catalog-driven realignment of materialized tenant Club Admin roles with the
-- live Permission catalog. Picks up finance.view / finance.structure.manage /
-- finance.admin (and any other new TENANT grantableByAdmin permissions) without
-- a permission-specific migration for each catalog addition.
--
-- Idempotent via RolePermission unique constraint.

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" LIKE 'club_admin__%'
  AND r."scope" = 'TENANT'
  AND r."isSystem" = true
  AND r."isArchived" = false
  AND p."scope" = 'TENANT'
  AND p."grantableByAdmin" = true
  AND p."key" NOT IN ('workspace.break_glass', 'workspace.governance.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
