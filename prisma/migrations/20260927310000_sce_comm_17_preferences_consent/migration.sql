-- SCE-COMM-17 — Communication preferences & consent
--
-- Recovery-safe against partial PostgreSQL apply (identifier truncation collision
-- on sponsor indexes). Converges enums, tables, indexes, and FKs without DROP.

-- ---------------------------------------------------------------------------
-- Enums (create if absent; fail if labels diverge)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "CommunicationPreferenceChannel" AS ENUM ('IN_APP', 'PUSH', 'EMAIL');
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT COALESCE(array_agg(e.enumlabel ORDER BY e.enumsortorder), ARRAY[]::name[])
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CommunicationPreferenceChannel'
    ) IS DISTINCT FROM ARRAY['IN_APP', 'PUSH', 'EMAIL']::name[] THEN
      RAISE EXCEPTION 'CommunicationPreferenceChannel enum labels diverge from COMM-17 canonical definition';
    END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunicationPreferenceCategory" AS ENUM (
    'TEAM_OPERATIONAL',
    'CLUB_OPERATIONAL',
    'CLUB_INFORMATION',
    'SPONSOR_COMMERCIAL'
  );
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT COALESCE(array_agg(e.enumlabel ORDER BY e.enumsortorder), ARRAY[]::name[])
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CommunicationPreferenceCategory'
    ) IS DISTINCT FROM ARRAY[
      'TEAM_OPERATIONAL',
      'CLUB_OPERATIONAL',
      'CLUB_INFORMATION',
      'SPONSOR_COMMERCIAL'
    ]::name[] THEN
      RAISE EXCEPTION 'CommunicationPreferenceCategory enum labels diverge from COMM-17 canonical definition';
    END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunicationPreferenceExplicitState" AS ENUM ('ENABLED', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT COALESCE(array_agg(e.enumlabel ORDER BY e.enumsortorder), ARRAY[]::name[])
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CommunicationPreferenceExplicitState'
    ) IS DISTINCT FROM ARRAY['ENABLED', 'DISABLED']::name[] THEN
      RAISE EXCEPTION 'CommunicationPreferenceExplicitState enum labels diverge from COMM-17 canonical definition';
    END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunicationPreferenceChangeSource" AS ENUM (
    'USER_SELF_SERVICE',
    'ADMIN',
    'SYSTEM',
    'IMPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN
    IF (
      SELECT COALESCE(array_agg(e.enumlabel ORDER BY e.enumsortorder), ARRAY[]::name[])
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'CommunicationPreferenceChangeSource'
    ) IS DISTINCT FROM ARRAY['USER_SELF_SERVICE', 'ADMIN', 'SYSTEM', 'IMPORT']::name[] THEN
      RAISE EXCEPTION 'CommunicationPreferenceChangeSource enum labels diverge from COMM-17 canonical definition';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "UserCommunicationPreference" (
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

CREATE TABLE IF NOT EXISTS "SponsorContactCommunicationPreference" (
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

-- ---------------------------------------------------------------------------
-- Indexes (explicit PostgreSQL-safe names; sponsor names avoid 63-byte collision)
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "UserCommunicationPreference_tenantId_userId_category_channel_key"
  ON "UserCommunicationPreference"("tenantId", "userId", "category", "channel");

CREATE INDEX IF NOT EXISTS "UserCommunicationPreference_tenantId_userId_idx"
  ON "UserCommunicationPreference"("tenantId", "userId");

-- Partial STAGE state: composite unique may exist only under the truncated default name.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'SponsorContactCommunicationPreference'
      AND indexname = 'SponsorContactCommunicationPreference_tenantId_sponsorContactId'
  ) THEN
    ALTER INDEX "SponsorContactCommunicationPreference_tenantId_sponsorContactId"
      RENAME TO "SponsorCommPref_tenant_sponsor_cat_chan_key";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SponsorCommPref_tenant_sponsor_cat_chan_key"
  ON "SponsorContactCommunicationPreference"("tenantId", "sponsorContactId", "category", "channel");

CREATE INDEX IF NOT EXISTS "SponsorCommPref_tenant_sponsor_idx"
  ON "SponsorContactCommunicationPreference"("tenantId", "sponsorContactId");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE "UserCommunicationPreference"
    ADD CONSTRAINT "UserCommunicationPreference_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "UserCommunicationPreference"
    ADD CONSTRAINT "UserCommunicationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SponsorContactCommunicationPreference"
    ADD CONSTRAINT "SponsorContactCommunicationPreference_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SponsorContactCommunicationPreference"
    ADD CONSTRAINT "SponsorContactCommunicationPreference_sponsorContactId_fkey"
    FOREIGN KEY ("sponsorContactId") REFERENCES "SponsorContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
