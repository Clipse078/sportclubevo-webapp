-- SCE-COMM-02 — Zielgruppen management permissions (tenant-scoped)

ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'COMMUNICATION';

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'communication.zielgruppen.view',
    'View communication target groups (Zielgruppen)',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'communication.zielgruppen.manage',
    'Manage communication target groups (Zielgruppen)',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "module" = EXCLUDED."module",
  "scope" = EXCLUDED."scope",
  "grantableByAdmin" = EXCLUDED."grantableByAdmin",
  "updatedAt" = CURRENT_TIMESTAMP;
