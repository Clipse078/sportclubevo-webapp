-- SCE-COMM-16 — platform communication templates + one-time publication scheduling

CREATE TYPE "PlatformCommunicationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "PlatformCommunicationPublicationScheduleStatus" AS ENUM (
  'SCHEDULED',
  'PROCESSING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED'
);

ALTER TABLE "PlatformCommunication"
  ADD COLUMN "sourcePlatformTemplateId" TEXT,
  ADD COLUMN "sourcePlatformTemplateVersion" TIMESTAMP(3);

CREATE TABLE "PlatformCommunicationTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "kind" "PlatformCommunicationKind" NOT NULL,
  "status" "PlatformCommunicationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "internalName" TEXT,
  "subject" TEXT,
  "bodyText" TEXT NOT NULL,
  "audienceSpecJson" JSONB,
  "orchestrationMetaJson" JSONB,
  "createdByUserId" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformCommunicationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationPublicationSchedule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "communicationId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "status" "PlatformCommunicationPublicationScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
  "claimedAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelledByUserId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "lastFailureReason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformCommunicationPublicationSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationPublicationSchedule_communicationId_key"
  ON "PlatformCommunicationPublicationSchedule"("communicationId");

CREATE INDEX "PlatformCommunicationTemplate_tenantId_status_idx"
  ON "PlatformCommunicationTemplate"("tenantId", "status");

CREATE INDEX "PlatformCommunicationTemplate_tenantId_kind_status_idx"
  ON "PlatformCommunicationTemplate"("tenantId", "kind", "status");

CREATE INDEX "PlatformCommunicationTemplate_tenantId_createdAt_idx"
  ON "PlatformCommunicationTemplate"("tenantId", "createdAt");

CREATE INDEX "PlatformCommunicationPublicationSchedule_tenantId_status_scheduledAt_idx"
  ON "PlatformCommunicationPublicationSchedule"("tenantId", "status", "scheduledAt");

CREATE INDEX "PlatformCommunicationPublicationSchedule_status_scheduledAt_idx"
  ON "PlatformCommunicationPublicationSchedule"("status", "scheduledAt");

CREATE INDEX "PlatformCommunication_tenantId_sourcePlatformTemplateId_idx"
  ON "PlatformCommunication"("tenantId", "sourcePlatformTemplateId");

ALTER TABLE "PlatformCommunication"
  ADD CONSTRAINT "PlatformCommunication_sourcePlatformTemplateId_fkey"
  FOREIGN KEY ("sourcePlatformTemplateId") REFERENCES "PlatformCommunicationTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationTemplate"
  ADD CONSTRAINT "PlatformCommunicationTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationTemplate"
  ADD CONSTRAINT "PlatformCommunicationTemplate_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPublicationSchedule"
  ADD CONSTRAINT "PlatformCommunicationPublicationSchedule_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPublicationSchedule"
  ADD CONSTRAINT "PlatformCommunicationPublicationSchedule_communicationId_fkey"
  FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPublicationSchedule"
  ADD CONSTRAINT "PlatformCommunicationPublicationSchedule_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPublicationSchedule"
  ADD CONSTRAINT "PlatformCommunicationPublicationSchedule_cancelledByUserId_fkey"
  FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
