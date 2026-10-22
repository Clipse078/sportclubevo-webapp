-- SCE-FINANCE-01B-R1
--
-- Backfill organisation finance permissions onto already-materialized tenant
-- Club Admin roles. FIN-01B created Permission rows but existing tenant Club
-- Admin roles do not automatically acquire permissions introduced later.
--
-- Canonical tenant Club Admin key shape:
--   club_admin__<tenantKey>
--
-- Authorization remains explicit:
-- - finance.view is required for /dashboard/finance (no setup-state bypass)
-- - no Trainer / Coordinator / normal tenant role is changed
-- - no tenant-specific special case
--
-- Idempotent via the RolePermission unique constraint.

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" LIKE 'club_admin__%'
  AND p."key" IN (
    'finance.view',
    'finance.structure.manage',
    'finance.admin'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
