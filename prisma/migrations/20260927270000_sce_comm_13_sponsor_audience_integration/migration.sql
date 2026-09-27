-- SCE-COMM-13 — Sponsor audience integration (additive; Sponsor domain + Communication recipient extensions)

ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'SPONSORING';

CREATE TYPE "PlatformCommunicationRecipientKind" AS ENUM (
  'INTERNAL_IN_APP',
  'INTERNAL_PERSON_NO_CHANNEL',
  'EXTERNAL_SPONSOR_CONTACT'
);

CREATE TYPE "SponsorOrganisationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "SponsorCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SponsorCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsorOrganisation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "SponsorOrganisationStatus" NOT NULL DEFAULT 'ACTIVE',
  "categoryId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SponsorOrganisation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsorContact" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sponsorOrganisationId" TEXT NOT NULL,
  "personId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SponsorContact_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD COLUMN IF NOT EXISTS "recipientKind" "PlatformCommunicationRecipientKind" NOT NULL DEFAULT 'INTERNAL_IN_APP',
  ADD COLUMN IF NOT EXISTS "sponsorContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalSnapshotJson" JSONB;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ALTER COLUMN "subjectPersonId" DROP NOT NULL,
  ALTER COLUMN "deliveryUserId" DROP NOT NULL;

CREATE INDEX "SponsorCategory_tenantId_isActive_idx" ON "SponsorCategory"("tenantId", "isActive");
CREATE UNIQUE INDEX "SponsorCategory_tenantId_name_key" ON "SponsorCategory"("tenantId", "name");

CREATE INDEX "SponsorOrganisation_tenantId_status_idx" ON "SponsorOrganisation"("tenantId", "status");
CREATE INDEX "SponsorOrganisation_tenantId_categoryId_idx" ON "SponsorOrganisation"("tenantId", "categoryId");
CREATE UNIQUE INDEX "SponsorOrganisation_tenantId_name_key" ON "SponsorOrganisation"("tenantId", "name");

CREATE INDEX "SponsorContact_tenantId_sponsorOrganisationId_isActive_idx" ON "SponsorContact"("tenantId", "sponsorOrganisationId", "isActive");
CREATE INDEX "SponsorContact_tenantId_personId_idx" ON "SponsorContact"("tenantId", "personId");

CREATE INDEX "PlatformCommunicationRecipientSnapshot_tenantId_sponsorContactId_idx"
  ON "PlatformCommunicationRecipientSnapshot"("tenantId", "sponsorContactId");

CREATE UNIQUE INDEX "PlatformCommunicationRecipientSnapshot_communicationId_sponsorContactId_key"
  ON "PlatformCommunicationRecipientSnapshot"("communicationId", "sponsorContactId");

ALTER TABLE "SponsorCategory" ADD CONSTRAINT "SponsorCategory_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SponsorOrganisation" ADD CONSTRAINT "SponsorOrganisation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SponsorOrganisation" ADD CONSTRAINT "SponsorOrganisation_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "SponsorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SponsorContact" ADD CONSTRAINT "SponsorContact_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SponsorContact" ADD CONSTRAINT "SponsorContact_sponsorOrganisationId_fkey"
  FOREIGN KEY ("sponsorOrganisationId") REFERENCES "SponsorOrganisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SponsorContact" ADD CONSTRAINT "SponsorContact_personId_fkey"
  FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot" ADD CONSTRAINT "PlatformCommunicationRecipientSnapshot_sponsorContactId_fkey"
  FOREIGN KEY ("sponsorContactId") REFERENCES "SponsorContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'sponsoring.view',
    'View sponsor and partner data for audience selection',
    'SPONSORING',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'sponsoring.manage',
    'Manage sponsors and partner organisations',
    'SPONSORING',
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
