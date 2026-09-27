-- SCE-COMM-09 — Mobile Push delivery foundation (additive)

-- CreateEnum
CREATE TYPE "PushDevicePlatform" AS ENUM ('WEB');

-- CreateEnum
CREATE TYPE "PushDeviceRegistrationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'INVALID');

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'PUSH';

-- AlterTable
ALTER TABLE "UserNotificationPreference" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "PushDeviceRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "platform" "PushDevicePlatform" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'WEB_PUSH',
    "subscriptionJson" TEXT NOT NULL,
    "status" "PushDeviceRegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPushDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notificationDeliveryId" TEXT NOT NULL,
    "pushDeviceRegistrationId" TEXT NOT NULL,
    "platformCommunicationRecipientSnapshotId" TEXT,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "failureCode" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPushDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushDeviceRegistration_userId_status_idx" ON "PushDeviceRegistration"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PushDeviceRegistration_userId_installationId_key" ON "PushDeviceRegistration"("userId", "installationId");

-- CreateIndex
CREATE INDEX "NotificationPushDeliveryAttempt_tenantId_status_createdAt_idx" ON "NotificationPushDeliveryAttempt"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationPushDeliveryAttempt_notificationDeliveryId_idx" ON "NotificationPushDeliveryAttempt"("notificationDeliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPushDeliveryAttempt_notificationDeliveryId_push_key" ON "NotificationPushDeliveryAttempt"("notificationDeliveryId", "pushDeviceRegistrationId");

-- AddForeignKey
ALTER TABLE "PushDeviceRegistration" ADD CONSTRAINT "PushDeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPushDeliveryAttempt" ADD CONSTRAINT "NotificationPushDeliveryAttempt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPushDeliveryAttempt" ADD CONSTRAINT "NotificationPushDeliveryAttempt_notificationDeliveryId_fkey" FOREIGN KEY ("notificationDeliveryId") REFERENCES "NotificationDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPushDeliveryAttempt" ADD CONSTRAINT "NotificationPushDeliveryAttempt_pushDeviceRegistrationId_fkey" FOREIGN KEY ("pushDeviceRegistrationId") REFERENCES "PushDeviceRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPushDeliveryAttempt" ADD CONSTRAINT "NotificationPushDeliveryAttempt_platformCommunicationRecipien_fkey" FOREIGN KEY ("platformCommunicationRecipientSnapshotId") REFERENCES "PlatformCommunicationRecipientSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
