-- SCE Tenant Documentation Workspace — foundation schema

-- CreateEnum
CREATE TYPE "TenantDocumentationResourceType" AS ENUM ('SPACE', 'PAGE');
CREATE TYPE "TenantDocumentationAccessLevel" AS ENUM ('VIEW', 'EDIT', 'PUBLISH', 'MANAGE');
CREATE TYPE "TenantDocumentationAccessSubjectType" AS ENUM ('CLUB', 'ORG_UNIT', 'TEAM', 'PERSON', 'ROLE_FUNCTION');
CREATE TYPE "TenantDocumentationDraftSaveStatus" AS ENUM ('SAVING', 'SAVED', 'DISCONNECTED');

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'TENANT_DOCUMENTATION';

-- CreateTable
CREATE TABLE "TenantDocumentationSpace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDocumentationSpace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDocumentationPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDocumentationPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDocumentationPageDraft" (
    "pageId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "yjsState" BYTEA NOT NULL DEFAULT '\x',
    "revision" BIGINT NOT NULL DEFAULT 0,
    "saveStatus" "TenantDocumentationDraftSaveStatus" NOT NULL DEFAULT 'SAVED',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "TenantDocumentationPageDraft_pkey" PRIMARY KEY ("pageId")
);

CREATE TABLE "TenantDocumentationPageVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "contentJson" JSONB NOT NULL,
    "plainText" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedByUserId" TEXT,

    CONSTRAINT "TenantDocumentationPageVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDocumentationAccessGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" "TenantDocumentationResourceType" NOT NULL,
    "spaceId" TEXT,
    "pageId" TEXT,
    "subjectType" "TenantDocumentationAccessSubjectType" NOT NULL,
    "accessLevel" "TenantDocumentationAccessLevel" NOT NULL,
    "personId" TEXT,
    "orgUnitId" TEXT,
    "teamId" TEXT,
    "roleFunctionKey" TEXT,
    "roleScopeOrgUnitId" TEXT,
    "roleScopeTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDocumentationAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantDocumentationCollaborationPresence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "cursorJson" JSONB,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "TenantDocumentationCollaborationPresence_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "TenantDocumentationSpace_tenantId_slug_key" ON "TenantDocumentationSpace"("tenantId", "slug");
CREATE INDEX "TenantDocumentationSpace_tenantId_idx" ON "TenantDocumentationSpace"("tenantId");

CREATE UNIQUE INDEX "TenantDocumentationPage_spaceId_parentId_slug_key" ON "TenantDocumentationPage"("spaceId", "parentId", "slug");
CREATE UNIQUE INDEX "TenantDocumentationPage_publishedVersionId_key" ON "TenantDocumentationPage"("publishedVersionId");
CREATE INDEX "TenantDocumentationPage_tenantId_idx" ON "TenantDocumentationPage"("tenantId");
CREATE INDEX "TenantDocumentationPage_spaceId_idx" ON "TenantDocumentationPage"("spaceId");
CREATE INDEX "TenantDocumentationPage_parentId_idx" ON "TenantDocumentationPage"("parentId");

CREATE INDEX "TenantDocumentationPageDraft_tenantId_idx" ON "TenantDocumentationPageDraft"("tenantId");

CREATE UNIQUE INDEX "TenantDocumentationPageVersion_pageId_versionNumber_key" ON "TenantDocumentationPageVersion"("pageId", "versionNumber");
CREATE INDEX "TenantDocumentationPageVersion_tenantId_idx" ON "TenantDocumentationPageVersion"("tenantId");
CREATE INDEX "TenantDocumentationPageVersion_tenantId_plainText_idx" ON "TenantDocumentationPageVersion"("tenantId", "plainText");

CREATE INDEX "TenantDocumentationAccessGrant_tenantId_idx" ON "TenantDocumentationAccessGrant"("tenantId");
CREATE INDEX "TenantDocumentationAccessGrant_tenantId_spaceId_idx" ON "TenantDocumentationAccessGrant"("tenantId", "spaceId");
CREATE INDEX "TenantDocumentationAccessGrant_tenantId_pageId_idx" ON "TenantDocumentationAccessGrant"("tenantId", "pageId");

CREATE UNIQUE INDEX "TenantDocumentationCollaborationPresence_pageId_userId_clientI_key" ON "TenantDocumentationCollaborationPresence"("pageId", "userId", "clientId");
CREATE INDEX "TenantDocumentationCollaborationPresence_pageId_lastSeenAt_idx" ON "TenantDocumentationCollaborationPresence"("pageId", "lastSeenAt");
CREATE INDEX "TenantDocumentationCollaborationPresence_tenantId_pageId_idx" ON "TenantDocumentationCollaborationPresence"("tenantId", "pageId");

-- ForeignKeys
ALTER TABLE "TenantDocumentationSpace" ADD CONSTRAINT "TenantDocumentationSpace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationSpace" ADD CONSTRAINT "TenantDocumentationSpace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantDocumentationPage" ADD CONSTRAINT "TenantDocumentationPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPage" ADD CONSTRAINT "TenantDocumentationPage_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "TenantDocumentationSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPage" ADD CONSTRAINT "TenantDocumentationPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TenantDocumentationPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPage" ADD CONSTRAINT "TenantDocumentationPage_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "TenantDocumentationPageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantDocumentationPageDraft" ADD CONSTRAINT "TenantDocumentationPageDraft_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "TenantDocumentationPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPageDraft" ADD CONSTRAINT "TenantDocumentationPageDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPageDraft" ADD CONSTRAINT "TenantDocumentationPageDraft_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantDocumentationPageVersion" ADD CONSTRAINT "TenantDocumentationPageVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPageVersion" ADD CONSTRAINT "TenantDocumentationPageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "TenantDocumentationPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationPageVersion" ADD CONSTRAINT "TenantDocumentationPageVersion_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "TenantDocumentationSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "TenantDocumentationPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationAccessGrant" ADD CONSTRAINT "TenantDocumentationAccessGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TenantDocumentationCollaborationPresence" ADD CONSTRAINT "TenantDocumentationCollaborationPresence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationCollaborationPresence" ADD CONSTRAINT "TenantDocumentationCollaborationPresence_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "TenantDocumentationPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantDocumentationCollaborationPresence" ADD CONSTRAINT "TenantDocumentationCollaborationPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;