-- SCE-ANLIEGEN-01 — Vereinsbetrieb «Anliegen & Meldungen» foundation (additive)
--
-- Club service desk: reporter cases, internal handling, conversation separation.
-- Zero-downtime additive migration; no STAGE data mutation in this package.

-- Permission module
ALTER TYPE "PermissionModule" ADD VALUE IF NOT EXISTS 'MELDUNGEN';

-- Task context for linked Aufgaben
ALTER TYPE "TaskContextType" ADD VALUE IF NOT EXISTS 'CLUB_MELDUNG';

-- In-app notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MELDUNG_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MELDUNG_REPORTER_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MELDUNG_RESOLVED';
ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'CLUB_MELDUNG';

-- Enums
CREATE TYPE "ClubMeldungCategory" AS ENUM (
  'DAMAGE_OR_PROBLEM',
  'QUESTION_OR_SUPPORT',
  'IDEA_OR_IMPROVEMENT',
  'OTHER'
);

CREATE TYPE "ClubMeldungStatus" AS ENUM (
  'RECEIVED',
  'IN_PROGRESS',
  'WAITING',
  'DONE'
);

CREATE TYPE "ClubMeldungMessageAudience" AS ENUM (
  'REPORTER_REPLY',
  'INTERNAL_NOTE'
);

CREATE TYPE "ClubMeldungHistoryEventType" AS ENUM (
  'CREATED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'REASSIGNED',
  'WAIT_REASON_SET',
  'RESOLUTION_RECORDED',
  'REOPENED',
  'DUPLICATE_MARKED',
  'FIELD_UPDATED',
  'COLLABORATOR_ADDED',
  'COLLABORATOR_REMOVED',
  'REPORTER_MESSAGE',
  'HANDLER_MESSAGE_TO_REPORTER'
);

CREATE TABLE "ClubMeldungNumberSequence" (
  "tenantId" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ClubMeldungNumberSequence_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE "ClubMeldung" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ClubMeldungCategory" NOT NULL,
  "locationHint" TEXT,
  "status" "ClubMeldungStatus" NOT NULL DEFAULT 'RECEIVED',
  "urgent" BOOLEAN NOT NULL DEFAULT false,
  "urgentNote" TEXT,
  "reporterUserId" TEXT NOT NULL,
  "orgUnitId" TEXT,
  "accountableUserId" TEXT,
  "awaitedExternalParty" TEXT,
  "nextStep" TEXT,
  "followUpAt" TIMESTAMP(3),
  "nextFeedbackAt" TIMESTAMP(3),
  "waitReason" TEXT,
  "resolutionSummary" TEXT,
  "reopenReason" TEXT,
  "duplicateOfId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClubMeldung_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMeldungCollaborator" (
  "id" TEXT NOT NULL,
  "meldungId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClubMeldungCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMeldungMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meldungId" TEXT NOT NULL,
  "audience" "ClubMeldungMessageAudience" NOT NULL,
  "body" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClubMeldungMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMeldungAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meldungId" TEXT NOT NULL,
  "communicationAttachmentId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClubMeldungAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMeldungHistoryEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "meldungId" TEXT NOT NULL,
  "eventType" "ClubMeldungHistoryEventType" NOT NULL,
  "actorUserId" TEXT,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClubMeldungHistoryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubMeldungCreateIdempotency" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "meldungId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClubMeldungCreateIdempotency_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "ClubMeldung_tenantId_caseNumber_key" ON "ClubMeldung"("tenantId", "caseNumber");
CREATE INDEX "ClubMeldung_tenantId_status_idx" ON "ClubMeldung"("tenantId", "status");
CREATE INDEX "ClubMeldung_tenantId_reporterUserId_idx" ON "ClubMeldung"("tenantId", "reporterUserId");
CREATE INDEX "ClubMeldung_tenantId_accountableUserId_idx" ON "ClubMeldung"("tenantId", "accountableUserId");
CREATE INDEX "ClubMeldung_tenantId_orgUnitId_idx" ON "ClubMeldung"("tenantId", "orgUnitId");
CREATE INDEX "ClubMeldung_tenantId_followUpAt_idx" ON "ClubMeldung"("tenantId", "followUpAt");
CREATE INDEX "ClubMeldung_tenantId_lastActivityAt_idx" ON "ClubMeldung"("tenantId", "lastActivityAt");
CREATE INDEX "ClubMeldung_duplicateOfId_idx" ON "ClubMeldung"("duplicateOfId");

CREATE UNIQUE INDEX "ClubMeldungCollaborator_meldungId_userId_key" ON "ClubMeldungCollaborator"("meldungId", "userId");
CREATE INDEX "ClubMeldungCollaborator_userId_idx" ON "ClubMeldungCollaborator"("userId");

CREATE INDEX "ClubMeldungMessage_tenantId_meldungId_idx" ON "ClubMeldungMessage"("tenantId", "meldungId");
CREATE INDEX "ClubMeldungMessage_meldungId_createdAt_idx" ON "ClubMeldungMessage"("meldungId", "createdAt");

CREATE INDEX "ClubMeldungAttachment_tenantId_meldungId_idx" ON "ClubMeldungAttachment"("tenantId", "meldungId");
CREATE UNIQUE INDEX "ClubMeldungAttachment_communicationAttachmentId_key" ON "ClubMeldungAttachment"("communicationAttachmentId");

CREATE INDEX "ClubMeldungHistoryEvent_meldungId_createdAt_idx" ON "ClubMeldungHistoryEvent"("meldungId", "createdAt");

CREATE UNIQUE INDEX "ClubMeldungCreateIdempotency_tenantId_reporterUserId_idempotencyKey_key"
  ON "ClubMeldungCreateIdempotency"("tenantId", "reporterUserId", "idempotencyKey");

-- Foreign keys
ALTER TABLE "ClubMeldungNumberSequence" ADD CONSTRAINT "ClubMeldungNumberSequence_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubMeldung" ADD CONSTRAINT "ClubMeldung_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldung" ADD CONSTRAINT "ClubMeldung_reporterUserId_fkey"
  FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMeldung" ADD CONSTRAINT "ClubMeldung_orgUnitId_fkey"
  FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClubMeldung" ADD CONSTRAINT "ClubMeldung_accountableUserId_fkey"
  FOREIGN KEY ("accountableUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClubMeldung" ADD CONSTRAINT "ClubMeldung_duplicateOfId_fkey"
  FOREIGN KEY ("duplicateOfId") REFERENCES "ClubMeldung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungCollaborator" ADD CONSTRAINT "ClubMeldungCollaborator_meldungId_fkey"
  FOREIGN KEY ("meldungId") REFERENCES "ClubMeldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungCollaborator" ADD CONSTRAINT "ClubMeldungCollaborator_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungCollaborator" ADD CONSTRAINT "ClubMeldungCollaborator_addedByUserId_fkey"
  FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungMessage" ADD CONSTRAINT "ClubMeldungMessage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungMessage" ADD CONSTRAINT "ClubMeldungMessage_meldungId_fkey"
  FOREIGN KEY ("meldungId") REFERENCES "ClubMeldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungMessage" ADD CONSTRAINT "ClubMeldungMessage_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungAttachment" ADD CONSTRAINT "ClubMeldungAttachment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungAttachment" ADD CONSTRAINT "ClubMeldungAttachment_meldungId_fkey"
  FOREIGN KEY ("meldungId") REFERENCES "ClubMeldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungAttachment" ADD CONSTRAINT "ClubMeldungAttachment_communicationAttachmentId_fkey"
  FOREIGN KEY ("communicationAttachmentId") REFERENCES "CommunicationAttachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungAttachment" ADD CONSTRAINT "ClubMeldungAttachment_uploadedByUserId_fkey"
  FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungHistoryEvent" ADD CONSTRAINT "ClubMeldungHistoryEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungHistoryEvent" ADD CONSTRAINT "ClubMeldungHistoryEvent_meldungId_fkey"
  FOREIGN KEY ("meldungId") REFERENCES "ClubMeldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungHistoryEvent" ADD CONSTRAINT "ClubMeldungHistoryEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClubMeldungCreateIdempotency" ADD CONSTRAINT "ClubMeldungCreateIdempotency_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungCreateIdempotency" ADD CONSTRAINT "ClubMeldungCreateIdempotency_reporterUserId_fkey"
  FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubMeldungCreateIdempotency" ADD CONSTRAINT "ClubMeldungCreateIdempotency_meldungId_fkey"
  FOREIGN KEY ("meldungId") REFERENCES "ClubMeldung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'meldungen.submit', 'Submit club concern reports', 'MELDUNGEN', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'meldungen.handle', 'Handle assigned club concern reports', 'MELDUNGEN', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'meldungen.view_all', 'View all club concern reports in tenant', 'MELDUNGEN', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'meldungen.manage', 'Manage club concern routing configuration', 'MELDUNGEN', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;