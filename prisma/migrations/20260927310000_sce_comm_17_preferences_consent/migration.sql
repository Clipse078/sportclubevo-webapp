-- SCE-COMM-17 — Communication preferences & consent

CREATE TYPE "CommunicationPreferenceChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');

CREATE TYPE "CommunicationPreferenceCategory" AS ENUM (
  'TEAM_OPERATIONAL',
  'CLUB_OPERATIONAL',
  'CLUB_INFORMATION',
  'SPONSOR_COMMERCIAL'
);

CREATE TYPE "CommunicationPreferenceExplicitState" AS ENUM ('ENABLED', 'DISABLED');

CREATE TYPE "CommunicationPreferenceChangeSource" AS ENUM (
  'USER_SELF_SERVICE',
  'ADMIN',
  'SYSTEM',
  'IMPORT'
);

CREATE TABLE "UserCommunicationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "CommunicationPreferenceCategory" NOT NULL,
  "channel" "CommunicationPreferenceChannel" NOT NULL,
  "explicitState" "CommunicationPreferenceExplicitState" NOT NULL,
  "source" "CommunicationPreferenceChangeSource" NOT NULL DEFAULT 'USER_SELF_SERVICE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserCommunicationPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SponsorContactCommunicationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sponsorContactId" TEXT NOT NULL,
  "category" "CommunicationPreferenceCategory" NOT NULL DEFAULT 'SPONSOR_COMMERCIAL',
  "channel" "CommunicationPreferenceChannel" NOT NULL,
  "explicitState" "CommunicationPreferenceExplicitState" NOT NULL,
  "source" "CommunicationPreferenceChangeSource" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SponsorContactCommunicationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCommunicationPreference_tenantId_userId_category_channel_key"
  ON "UserCommunicationPreference"("tenantId", "userId", "category", "channel");

CREATE INDEX "UserCommunicationPreference_tenantId_userId_idx"
  ON "UserCommunicationPreference"("tenantId", "userId");

CREATE UNIQUE INDEX "SponsorContactCommunicationPreference_tenantId_sponsorContactId_category_channel_key"
  ON "SponsorContactCommunicationPreference"("tenantId", "sponsorContactId", "category", "channel");

CREATE INDEX "SponsorContactCommunicationPreference_tenantId_sponsorContactId_idx"
  ON "SponsorContactCommunicationPreference"("tenantId", "sponsorContactId");

ALTER TABLE "UserCommunicationPreference"
  ADD CONSTRAINT "UserCommunicationPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCommunicationPreference"
  ADD CONSTRAINT "UserCommunicationPreference_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SponsorContactCommunicationPreference"
  ADD CONSTRAINT "SponsorContactCommunicationPreference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SponsorContactCommunicationPreference"
  ADD CONSTRAINT "SponsorContactCommunicationPreference_sponsorContactId_fkey"
  FOREIGN KEY ("sponsorContactId") REFERENCES "SponsorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
