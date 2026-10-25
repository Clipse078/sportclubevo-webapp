-- SCE-FIN-06A — financial publishing & sharing architecture foundation (additive).

CREATE TYPE "FinancePublicationLifecycleStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PUBLISHED',
  'SUPERSEDED',
  'REVOKED'
);

CREATE TYPE "FinancePublishingAudienceClass" AS ENUM (
  'INTERNAL_AUTHENTICATED',
  'SPECIFIC_USERS',
  'SPECIFIC_ROLES',
  'ORGANISATION_MEMBERS',
  'LINK_RESTRICTED',
  'PUBLIC'
);

CREATE TYPE "FinanceFinancialShareStatus" AS ENUM (
  'ACTIVE',
  'REVOKED',
  'EXPIRED'
);

CREATE TABLE "FinanceDisclosurePolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "externalSharingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "publicPublishingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "policyJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceDisclosurePolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePublication" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "lifecycleStatus" "FinancePublicationLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  "reportingScopeJson" JSONB NOT NULL,
  "currentVersionId" TEXT,
  "createdByUserId" TEXT,
  "publishedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePublicationVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "lifecycleStatus" "FinancePublicationLifecycleStatus" NOT NULL,
  "snapshotSchemaVersion" TEXT NOT NULL,
  "snapshotPayloadJson" JSONB NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "audienceClass" "FinancePublishingAudienceClass" NOT NULL,
  "audiencePolicyJson" JSONB,
  "sourceMetadataJson" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "publishedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancePublicationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceFinancialShare" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "financeYearId" TEXT NOT NULL,
  "status" "FinanceFinancialShareStatus" NOT NULL DEFAULT 'ACTIVE',
  "liveScopeJson" JSONB NOT NULL,
  "audienceClass" "FinancePublishingAudienceClass" NOT NULL,
  "audiencePolicyJson" JSONB,
  "tokenHash" TEXT,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "revokedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinanceFinancialShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinanceDisclosurePolicy_tenantId_key" ON "FinanceDisclosurePolicy"("tenantId");

CREATE INDEX "FinancePublication_tenantId_financeYearId_idx" ON "FinancePublication"("tenantId", "financeYearId");
CREATE INDEX "FinancePublication_tenantId_lifecycleStatus_idx" ON "FinancePublication"("tenantId", "lifecycleStatus");

CREATE UNIQUE INDEX "FinancePublicationVersion_publicationId_versionNumber_key" ON "FinancePublicationVersion"("publicationId", "versionNumber");
CREATE INDEX "FinancePublicationVersion_tenantId_publicationId_idx" ON "FinancePublicationVersion"("tenantId", "publicationId");
CREATE INDEX "FinancePublicationVersion_tenantId_lifecycleStatus_idx" ON "FinancePublicationVersion"("tenantId", "lifecycleStatus");

CREATE INDEX "FinanceFinancialShare_tenantId_financeYearId_idx" ON "FinanceFinancialShare"("tenantId", "financeYearId");
CREATE INDEX "FinanceFinancialShare_tenantId_status_idx" ON "FinanceFinancialShare"("tenantId", "status");
CREATE INDEX "FinanceFinancialShare_tenantId_tokenHash_idx" ON "FinanceFinancialShare"("tenantId", "tokenHash");

ALTER TABLE "FinanceDisclosurePolicy" ADD CONSTRAINT "FinanceDisclosurePolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FinancePublication" ADD CONSTRAINT "FinancePublication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublication" ADD CONSTRAINT "FinancePublication_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancePublication" ADD CONSTRAINT "FinancePublication_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePublication" ADD CONSTRAINT "FinancePublication_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancePublicationVersion" ADD CONSTRAINT "FinancePublicationVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationVersion" ADD CONSTRAINT "FinancePublicationVersion_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "FinancePublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePublicationVersion" ADD CONSTRAINT "FinancePublicationVersion_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinanceFinancialShare" ADD CONSTRAINT "FinanceFinancialShare_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinanceFinancialShare" ADD CONSTRAINT "FinanceFinancialShare_financeYearId_fkey" FOREIGN KEY ("financeYearId") REFERENCES "FinanceYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinanceFinancialShare" ADD CONSTRAINT "FinanceFinancialShare_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceFinancialShare" ADD CONSTRAINT "FinanceFinancialShare_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
