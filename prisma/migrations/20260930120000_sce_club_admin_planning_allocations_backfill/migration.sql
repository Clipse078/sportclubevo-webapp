-- SCE — planning.allocations.* catalog + tenant Club Admin backfill
--
-- New TENANT permissions added to prisma/seed.ts do not automatically attach
-- to already-materialized club_admin__<tenantKey> Role rows. This migration
-- mirrors prior club_admin backfills (users.invite, PERSON-UX-03).

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'planning.allocations.view',
    'View planning allocations',
    'TRAININGS',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'planning.allocations.manage',
    'Manage planning allocations',
    'TRAININGS',
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
  AND r."isArchived" = false
  AND p."key" IN ('planning.allocations.view', 'planning.allocations.manage')
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
  AND p."key" IN ('planning.allocations.view', 'planning.allocations.manage')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
