-- WORKSPACE-08-01 — durable tenant-scoped workspace governance audit indexes

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "workspaceDocumentVersionId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_createdAt_idx"
  ON "AuditLog"("tenantId", "action", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_moduleKey_createdAt_idx"
  ON "AuditLog"("tenantId", "moduleKey", "createdAt");

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_workspaceDocumentVersionId_createdAt_idx"
  ON "AuditLog"("tenantId", "workspaceDocumentVersionId", "createdAt");

-- Permission row (idempotent; existing deployments may already seed via prisma/seed.ts)
INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'workspace.audit.view',
  'View workspace governance audit',
  'WORKSPACE',
  'TENANT',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "key" = 'workspace.audit.view'
);
