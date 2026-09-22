-- WORKSPACE-01 — canonical Workspace access policy / grants foundation

-- CreateEnum
CREATE TYPE "WorkspaceAccessInheritanceMode" AS ENUM ('INHERIT', 'EXPLICIT');

-- CreateEnum
CREATE TYPE "WorkspaceResourceType" AS ENUM ('FOLDER', 'DOCUMENT');

-- AlterEnum (additive — preserve legacy members)
ALTER TYPE "WorkspaceAccessSubjectType" ADD VALUE IF NOT EXISTS 'ORGANISATION';
ALTER TYPE "WorkspaceAccessSubjectType" ADD VALUE IF NOT EXISTS 'PERSON';

-- AlterTable
ALTER TABLE "WorkspaceFolder" ADD COLUMN     "accessInheritanceMode" "WorkspaceAccessInheritanceMode" NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "accessModelVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "WorkspaceDocument" ADD COLUMN     "accessInheritanceMode" "WorkspaceAccessInheritanceMode" NOT NULL DEFAULT 'INHERIT',
ADD COLUMN     "accessModelVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "WorkspaceAccessGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" "WorkspaceResourceType" NOT NULL,
    "folderId" TEXT,
    "documentId" TEXT,
    "subjectType" "WorkspaceAccessSubjectType" NOT NULL,
    "accessLevel" "WorkspaceAccessLevel" NOT NULL,
    "personId" TEXT,
    "orgUnitId" TEXT,
    "teamId" TEXT,
    "roleFunctionKey" TEXT,
    "roleScopeOrgUnitId" TEXT,
    "roleScopeTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceFolder_tenantId_accessInheritanceMode_idx" ON "WorkspaceFolder"("tenantId", "accessInheritanceMode");

-- CreateIndex
CREATE INDEX "WorkspaceDocument_tenantId_accessInheritanceMode_idx" ON "WorkspaceDocument"("tenantId", "accessInheritanceMode");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_idx" ON "WorkspaceAccessGrant"("tenantId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_folderId_idx" ON "WorkspaceAccessGrant"("tenantId", "folderId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_documentId_idx" ON "WorkspaceAccessGrant"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_resourceType_idx" ON "WorkspaceAccessGrant"("tenantId", "resourceType");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_subjectType_idx" ON "WorkspaceAccessGrant"("tenantId", "subjectType");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_orgUnitId_idx" ON "WorkspaceAccessGrant"("tenantId", "orgUnitId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_teamId_idx" ON "WorkspaceAccessGrant"("tenantId", "teamId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_personId_idx" ON "WorkspaceAccessGrant"("tenantId", "personId");

-- CreateIndex
CREATE INDEX "WorkspaceAccessGrant_tenantId_roleFunctionKey_idx" ON "WorkspaceAccessGrant"("tenantId", "roleFunctionKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_folderId_subjectType_orgUnitId_key" ON "WorkspaceAccessGrant"("folderId", "subjectType", "orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_folderId_subjectType_teamId_key" ON "WorkspaceAccessGrant"("folderId", "subjectType", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_folderId_subjectType_personId_key" ON "WorkspaceAccessGrant"("folderId", "subjectType", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_folderId_subjectType_roleFunctionKey_roleScopeOrgUnitId_roleScopeTeamId_key" ON "WorkspaceAccessGrant"("folderId", "subjectType", "roleFunctionKey", "roleScopeOrgUnitId", "roleScopeTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_documentId_subjectType_orgUnitId_key" ON "WorkspaceAccessGrant"("documentId", "subjectType", "orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_documentId_subjectType_teamId_key" ON "WorkspaceAccessGrant"("documentId", "subjectType", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_documentId_subjectType_personId_key" ON "WorkspaceAccessGrant"("documentId", "subjectType", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAccessGrant_documentId_subjectType_roleFunctionKey_roleScopeOrgUnitId_roleScopeTeamId_key" ON "WorkspaceAccessGrant"("documentId", "subjectType", "roleFunctionKey", "roleScopeOrgUnitId", "roleScopeTeamId");

-- One organisation boundary grant per folder/document
CREATE UNIQUE INDEX "WorkspaceAccessGrant_folder_organisation_unique" ON "WorkspaceAccessGrant"("folderId") WHERE "subjectType" = 'ORGANISATION' AND "folderId" IS NOT NULL;

CREATE UNIQUE INDEX "WorkspaceAccessGrant_document_organisation_unique" ON "WorkspaceAccessGrant"("documentId") WHERE "subjectType" = 'ORGANISATION' AND "documentId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "WorkspaceFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAccessGrant" ADD CONSTRAINT "WorkspaceAccessGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Legacy backfill — CLUB-equivalent organisation boundary on roots only.
-- Nested folders/documents inherit (no redundant grant rows).
-- ---------------------------------------------------------------------------
UPDATE "WorkspaceFolder"
SET "accessInheritanceMode" = 'EXPLICIT'
WHERE "parentId" IS NULL;

UPDATE "WorkspaceDocument" d
SET "accessInheritanceMode" = 'EXPLICIT'
WHERE d."folderId" IS NULL;

INSERT INTO "WorkspaceAccessGrant" (
    "id", "tenantId", "resourceType", "folderId", "documentId",
    "subjectType", "accessLevel", "createdAt", "updatedAt"
)
SELECT
    'ws01bf_f_' || f."id",
    f."tenantId",
    'FOLDER'::"WorkspaceResourceType",
    f."id",
    NULL,
    'ORGANISATION'::"WorkspaceAccessSubjectType",
    'VIEW'::"WorkspaceAccessLevel",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WorkspaceFolder" f
WHERE f."parentId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceAccessGrant" g
    WHERE g."folderId" = f."id" AND g."subjectType" = 'ORGANISATION'
  );

INSERT INTO "WorkspaceAccessGrant" (
    "id", "tenantId", "resourceType", "folderId", "documentId",
    "subjectType", "accessLevel", "createdAt", "updatedAt"
)
SELECT
    'ws01bf_d_' || d."id",
    d."tenantId",
    'DOCUMENT'::"WorkspaceResourceType",
    NULL,
    d."id",
    'ORGANISATION'::"WorkspaceAccessSubjectType",
    'VIEW'::"WorkspaceAccessLevel",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WorkspaceDocument" d
WHERE d."folderId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceAccessGrant" g
    WHERE g."documentId" = d."id" AND g."subjectType" = 'ORGANISATION'
  );
