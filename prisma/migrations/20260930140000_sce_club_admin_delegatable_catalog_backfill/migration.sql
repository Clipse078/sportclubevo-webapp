-- SCE-ACCESS-CLUBADMIN-DELEGATION-01 — catalog-driven Club Admin backfill
--
-- Materialized tenant Club Admin roles (club_admin__<tenantKey>) must hold
-- every TENANT permission with grantableByAdmin=true except explicit governance
-- exclusions. New catalog permissions added via migrations do not flow onto
-- existing Club Admin Role rows until reconciled; this migration aligns all
-- canonical Club Admin roles with the live Permission catalog (idempotent).

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
