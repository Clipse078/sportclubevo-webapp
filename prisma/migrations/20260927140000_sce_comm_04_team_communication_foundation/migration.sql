-- SCE-COMM-04 — Team communication foundation (additive)

CREATE TYPE "PlatformCommunicationKind" AS ENUM (
  'MESSAGE',
  'ANNOUNCEMENT',
  'ALERT',
  'POLL',
  'DATE_POLL',
  'REQUEST',
  'CAMPAIGN'
);

CREATE TYPE "PlatformCommunicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "PlatformCommunicationContextKind" AS ENUM ('TEAM');

CREATE TYPE "PlatformCommunicationConversationKind" AS ENUM ('TEAM_GENERAL', 'TEAM_NAMED');

CREATE TYPE "PlatformCommunicationRecipientEngagement" AS ENUM (
  'PENDING',
  'DELIVERED',
  'READ',
  'ACKNOWLEDGED',
  'RESPONDED'
);

ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'COMMUNICATION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_COMMUNICATION_PUBLISHED';
ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'COMMUNICATION';

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (
    gen_random_uuid()::text,
    'communication.team.view',
    'View team communication',
    'COMMUNICATION',
    'TENANT',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'communication.team.send',
    'Send team communication',
    'COMMUNICATION',
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

CREATE TABLE "PlatformCommunicationConversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contextKind" "PlatformCommunicationContextKind" NOT NULL,
  "teamId" TEXT,
  "conversationKind" "PlatformCommunicationConversationKind" NOT NULL DEFAULT 'TEAM_GENERAL',
  "namedThreadSlug" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformCommunicationConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunication" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "kind" "PlatformCommunicationKind" NOT NULL,
  "status" "PlatformCommunicationStatus" NOT NULL DEFAULT 'DRAFT',
  "contextRef" JSONB NOT NULL,
  "senderPersonId" TEXT,
  "subject" TEXT,
  "bodyText" TEXT NOT NULL,
  "audienceSpecJson" JSONB NOT NULL,
  "audienceFingerprint" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformCommunication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationRecipientSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "subjectPersonId" TEXT NOT NULL,
  "deliveryUserId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "audienceFingerprint" TEXT NOT NULL,
  "viaGuardianSubstitution" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3) NOT NULL,
  "engagement" "PlatformCommunicationRecipientEngagement" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformCommunicationRecipientSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationConversation_tenantId_contextKind_teamId_conversationKind_namedThreadSlug_key"
  ON "PlatformCommunicationConversation"("tenantId", "contextKind", "teamId", "conversationKind", "namedThreadSlug");

CREATE INDEX "PlatformCommunicationConversation_tenantId_teamId_idx"
  ON "PlatformCommunicationConversation"("tenantId", "teamId");

CREATE INDEX "PlatformCommunicationConversation_tenantId_createdAt_idx"
  ON "PlatformCommunicationConversation"("tenantId", "createdAt");

CREATE INDEX "PlatformCommunication_tenantId_conversationId_createdAt_idx"
  ON "PlatformCommunication"("tenantId", "conversationId", "createdAt");

CREATE INDEX "PlatformCommunication_tenantId_status_createdAt_idx"
  ON "PlatformCommunication"("tenantId", "status", "createdAt");

CREATE INDEX "PlatformCommunication_tenantId_kind_idx" ON "PlatformCommunication"("tenantId", "kind");

CREATE INDEX "PlatformCommunication_senderPersonId_idx" ON "PlatformCommunication"("senderPersonId");

CREATE INDEX "PlatformCommunicationRecipientSnapshot_tenantId_communicationId_idx"
  ON "PlatformCommunicationRecipientSnapshot"("tenantId", "communicationId");

CREATE INDEX "PlatformCommunicationRecipientSnapshot_tenantId_subjectPersonId_idx"
  ON "PlatformCommunicationRecipientSnapshot"("tenantId", "subjectPersonId");

CREATE INDEX "PlatformCommunicationRecipientSnapshot_tenantId_deliveryUserId_idx"
  ON "PlatformCommunicationRecipientSnapshot"("tenantId", "deliveryUserId");

CREATE UNIQUE INDEX "PlatformCommunicationRecipientSnapshot_communicationId_subjectPersonId_deliveryUserId_channel_key"
  ON "PlatformCommunicationRecipientSnapshot"("communicationId", "subjectPersonId", "deliveryUserId", "channel");

ALTER TABLE "PlatformCommunicationConversation"
  ADD CONSTRAINT "PlatformCommunicationConversation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationConversation"
  ADD CONSTRAINT "PlatformCommunicationConversation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "PlatformCommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_senderPersonId_fkey"
  FOREIGN KEY ("senderPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD CONSTRAINT "PlatformCommunicationRecipientSnapshot_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD CONSTRAINT "PlatformCommunicationRecipientSnapshot_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRecipientSnapshot"
  ADD CONSTRAINT "PlatformCommunicationRecipientSnapshot_subjectPersonId_fkey"
  FOREIGN KEY ("subjectPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
