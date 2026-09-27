-- SCE-COMM-14: Canonical outbound email delivery for PlatformCommunication recipients.

CREATE TYPE "PlatformCommunicationEmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "PlatformCommunicationEmailDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "platformCommunicationRecipientSnapshotId" TEXT NOT NULL,
    "status" "PlatformCommunicationEmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerMessageId" TEXT,
    "failureCode" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationEmailDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationEmailDeliveryAttempt_platformCommunicationRecipientSnapshotId_key" ON "PlatformCommunicationEmailDeliveryAttempt"("platformCommunicationRecipientSnapshotId");

CREATE UNIQUE INDEX "PlatformCommunicationEmailDeliveryAttempt_idempotencyKey_key" ON "PlatformCommunicationEmailDeliveryAttempt"("idempotencyKey");

CREATE INDEX "PlatformCommunicationEmailDeliveryAttempt_tenantId_communicationId_idx" ON "PlatformCommunicationEmailDeliveryAttempt"("tenantId", "communicationId");

CREATE INDEX "PlatformCommunicationEmailDeliveryAttempt_tenantId_status_createdAt_idx" ON "PlatformCommunicationEmailDeliveryAttempt"("tenantId", "status", "createdAt");

ALTER TABLE "PlatformCommunicationEmailDeliveryAttempt" ADD CONSTRAINT "PlatformCommunicationEmailDeliveryAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationEmailDeliveryAttempt" ADD CONSTRAINT "PlatformCommunicationEmailDeliveryAttempt_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationEmailDeliveryAttempt" ADD CONSTRAINT "PlatformCommunicationEmailDeliveryAttempt_platformCommunicationRec_fkey" FOREIGN KEY ("platformCommunicationRecipientSnapshotId") REFERENCES "PlatformCommunicationRecipientSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
