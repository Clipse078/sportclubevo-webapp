-- WORKSPACE-06 — lifecycle (TRASHED), favorites, recent access (additive).

ALTER TYPE "WorkspaceDocumentStatus" ADD VALUE IF NOT EXISTS 'TRASHED';

CREATE TYPE "WorkspaceCollaborationResourceType" AS ENUM ('FOLDER', 'DOCUMENT');

ALTER TABLE "WorkspaceDocument" ADD COLUMN IF NOT EXISTS "trashedAt" TIMESTAMP(3);

ALTER TABLE "WorkspaceFolder" ADD COLUMN IF NOT EXISTS "trashedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "WorkspaceDocument_tenantId_trashedAt_idx"
  ON "WorkspaceDocument"("tenantId", "trashedAt");

CREATE INDEX IF NOT EXISTS "WorkspaceFolder_tenantId_trashedAt_idx"
  ON "WorkspaceFolder"("tenantId", "trashedAt");

CREATE TABLE "WorkspaceFavorite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" "WorkspaceCollaborationResourceType" NOT NULL,
    "folderId" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceRecentAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" "WorkspaceCollaborationResourceType" NOT NULL,
    "folderId" TEXT,
    "documentId" TEXT,
    "versionId" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceRecentAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceFavorite_tenantId_userId_folderId_key"
  ON "WorkspaceFavorite"("tenantId", "userId", "folderId");

CREATE UNIQUE INDEX "WorkspaceFavorite_tenantId_userId_documentId_key"
  ON "WorkspaceFavorite"("tenantId", "userId", "documentId");

CREATE INDEX "WorkspaceFavorite_tenantId_userId_idx"
  ON "WorkspaceFavorite"("tenantId", "userId");

CREATE INDEX "WorkspaceFavorite_tenantId_userId_createdAt_idx"
  ON "WorkspaceFavorite"("tenantId", "userId", "createdAt");

CREATE INDEX "WorkspaceRecentAccess_tenantId_userId_accessedAt_idx"
  ON "WorkspaceRecentAccess"("tenantId", "userId", "accessedAt");

CREATE INDEX "WorkspaceRecentAccess_tenantId_userId_documentId_idx"
  ON "WorkspaceRecentAccess"("tenantId", "userId", "documentId");

CREATE INDEX "WorkspaceRecentAccess_tenantId_userId_folderId_idx"
  ON "WorkspaceRecentAccess"("tenantId", "userId", "folderId");

ALTER TABLE "WorkspaceFavorite" ADD CONSTRAINT "WorkspaceFavorite_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceFavorite" ADD CONSTRAINT "WorkspaceFavorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceFavorite" ADD CONSTRAINT "WorkspaceFavorite_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "WorkspaceFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceFavorite" ADD CONSTRAINT "WorkspaceFavorite_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceRecentAccess" ADD CONSTRAINT "WorkspaceRecentAccess_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceRecentAccess" ADD CONSTRAINT "WorkspaceRecentAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceRecentAccess" ADD CONSTRAINT "WorkspaceRecentAccess_folderId_fkey"
  FOREIGN KEY ("folderId") REFERENCES "WorkspaceFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceRecentAccess" ADD CONSTRAINT "WorkspaceRecentAccess_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
