-- FIN-06E-R1 — finance.reporting.distribute catalog + tenant Club Admin backfill
--
-- Schema migration 20261026160000 introduced distribution tables but not the
-- new permission row or RolePermission grants on existing materialized Club
-- Admin roles. Operators who already had FIN-06D publication keys therefore
-- lacked distribute until reconciled. Idempotent alignment for all tenants.

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'finance.reporting.distribute',
    'Distribute published financial reports',
    'FINANCE',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;

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
  AND p."key" = 'finance.reporting.distribute'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" = 'super_admin'
  AND p."key" = 'finance.reporting.distribute'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
