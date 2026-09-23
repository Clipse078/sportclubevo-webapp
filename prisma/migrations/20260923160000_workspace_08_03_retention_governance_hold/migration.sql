-- WORKSPACE-08-03 — trash retention policy + governance holds

CREATE TYPE "WorkspaceGovernanceHoldScopeType" AS ENUM ('DOCUMENT', 'FOLDER_SUBTREE');

CREATE TABLE "WorkspaceTrashRetentionPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "trashRetentionDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceTrashRetentionPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceGovernanceHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scopeType" "WorkspaceGovernanceHoldScopeType" NOT NULL,
    "documentId" TEXT,
    "folderId" TEXT,
    "reason" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "createdByPersonId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedByUserId" TEXT,
    "releasedByPersonId" TEXT,
    "releaseReason" TEXT,

    CONSTRAINT "WorkspaceGovernanceHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceTrashRetentionPolicy_tenantId_key"
  ON "WorkspaceTrashRetentionPolicy"("tenantId");

ALTER TABLE "WorkspaceTrashRetentionPolicy" ADD CONSTRAINT "WorkspaceTrashRetentionPolicy_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "WorkspaceFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_releasedByUserId_fkey"
  FOREIGN KEY ("releasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_releasedByPersonId_fkey"
  FOREIGN KEY ("releasedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkspaceGovernanceHold" ADD CONSTRAINT "WorkspaceGovernanceHold_scope_target_check"
  CHECK (
    ("scopeType" = 'DOCUMENT' AND "documentId" IS NOT NULL AND "folderId" IS NULL)
    OR
    ("scopeType" = 'FOLDER_SUBTREE' AND "folderId" IS NOT NULL AND "documentId" IS NULL)
  );

CREATE INDEX "WorkspaceGovernanceHold_tenantId_documentId_releasedAt_idx"
  ON "WorkspaceGovernanceHold"("tenantId", "documentId", "releasedAt");

CREATE INDEX "WorkspaceGovernanceHold_tenantId_folderId_releasedAt_idx"
  ON "WorkspaceGovernanceHold"("tenantId", "folderId", "releasedAt");

CREATE INDEX "WorkspaceGovernanceHold_tenantId_createdAt_idx"
  ON "WorkspaceGovernanceHold"("tenantId", "createdAt");
