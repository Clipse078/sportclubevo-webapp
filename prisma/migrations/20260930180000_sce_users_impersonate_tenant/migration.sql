-- SCE-FCA-ADMIN-UX-IMPERSONATION-01 — tenant-scoped impersonation for Club Admins

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'users.impersonate_tenant',
  'Benutzer imitieren (Verein)',
  'USERS'::"PermissionModule",
  'TENANT'::"PermissionScope",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "key" = 'users.impersonate_tenant'
);

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
  AND p."key" = 'users.impersonate_tenant'
  AND p."scope" = 'TENANT'
  AND p."grantableByAdmin" = true
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
