-- WORKSPACE-08-02 — explicit tenant-scoped break-glass governance sessions

CREATE TYPE "WorkspaceBreakGlassScopeType" AS ENUM ('DOCUMENT', 'FOLDER_SUBTREE');

CREATE TYPE "WorkspaceBreakGlassSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'REVOKED', 'EXPIRED');

CREATE TABLE "WorkspaceBreakGlassSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorPersonId" TEXT,
    "scopeType" "WorkspaceBreakGlassScopeType" NOT NULL,
    "workspaceDocumentId" TEXT,
    "workspaceFolderId" TEXT,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "status" "WorkspaceBreakGlassSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBreakGlassSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_actorPersonId_fkey"
  FOREIGN KEY ("actorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_workspaceDocumentId_fkey"
  FOREIGN KEY ("workspaceDocumentId") REFERENCES "WorkspaceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_workspaceFolderId_fkey"
  FOREIGN KEY ("workspaceFolderId") REFERENCES "WorkspaceFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_revokedByUserId_fkey"
  FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceBreakGlassSession" ADD CONSTRAINT "WorkspaceBreakGlassSession_scope_target_check"
  CHECK (
    ("scopeType" = 'DOCUMENT' AND "workspaceDocumentId" IS NOT NULL AND "workspaceFolderId" IS NULL)
    OR
    ("scopeType" = 'FOLDER_SUBTREE' AND "workspaceFolderId" IS NOT NULL AND "workspaceDocumentId" IS NULL)
  );

CREATE INDEX "WorkspaceBreakGlassSession_tenantId_actorUserId_status_idx"
  ON "WorkspaceBreakGlassSession"("tenantId", "actorUserId", "status");

CREATE INDEX "WorkspaceBreakGlassSession_tenantId_status_expiresAt_idx"
  ON "WorkspaceBreakGlassSession"("tenantId", "status", "expiresAt");

CREATE INDEX "WorkspaceBreakGlassSession_tenantId_expiresAt_idx"
  ON "WorkspaceBreakGlassSession"("tenantId", "expiresAt");

CREATE INDEX "WorkspaceBreakGlassSession_workspaceDocumentId_idx"
  ON "WorkspaceBreakGlassSession"("workspaceDocumentId");

CREATE INDEX "WorkspaceBreakGlassSession_workspaceFolderId_idx"
  ON "WorkspaceBreakGlassSession"("workspaceFolderId");

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'workspace.governance.manage',
  'Manage workspace governance operations',
  'WORKSPACE',
  'TENANT',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "key" = 'workspace.governance.manage'
);

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'workspace.break_glass',
  'Activate workspace break-glass exceptional access',
  'WORKSPACE',
  'TENANT',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Permission" WHERE "key" = 'workspace.break_glass'
);
