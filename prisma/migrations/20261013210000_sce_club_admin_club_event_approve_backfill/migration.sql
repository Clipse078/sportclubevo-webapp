-- SCE-ACTIVITY-CREATE-01C-R2 — backfill activities.club_event.approve onto canonical Club Admin roles.
-- The permission was added in 01C after the catalog-driven Club Admin backfill; existing
-- materialized club_admin__* roles need the same idempotent alignment.

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
  AND p."key" = 'activities.club_event.approve'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
