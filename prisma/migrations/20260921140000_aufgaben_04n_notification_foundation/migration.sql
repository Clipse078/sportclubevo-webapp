-- AUFGABEN-04N — SCE notification center & delivery foundation

CREATE TYPE "NotificationCategory" AS ENUM ('TASK', 'PARTICIPATION');

CREATE TYPE "NotificationType" AS ENUM (
  'TASK_ASSIGNED',
  'SUBTASK_ASSIGNED',
  'TASK_DUE_SOON',
  'TASK_OVERDUE',
  'TASK_DEADLINE_CHANGED',
  'TASK_REMINDER',
  'PARTICIPATION_REMINDER',
  'PARTICIPATION_OVERDUE',
  'TASK_MENTION'
);

CREATE TYPE "NotificationEntityType" AS ENUM ('TASK', 'TRAINING_SESSION', 'EVENT');

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "entityType" "NotificationEntityType",
  "entityId" TEXT,
  "deduplicationKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "provider" TEXT,
  "providerMessageId" TEXT,
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserNotificationPreference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationType" "NotificationType" NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_tenantId_deduplicationKey_key" ON "Notification"("tenantId", "deduplicationKey");

CREATE INDEX "Notification_tenantId_recipientUserId_readAt_idx" ON "Notification"("tenantId", "recipientUserId", "readAt");

CREATE INDEX "Notification_tenantId_recipientUserId_createdAt_idx" ON "Notification"("tenantId", "recipientUserId", "createdAt");

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key" ON "NotificationDelivery"("notificationId", "channel");

CREATE INDEX "NotificationDelivery_tenantId_status_channel_createdAt_idx" ON "NotificationDelivery"("tenantId", "status", "channel", "createdAt");

CREATE INDEX "NotificationDelivery_notificationId_idx" ON "NotificationDelivery"("notificationId");

CREATE UNIQUE INDEX "UserNotificationPreference_tenantId_userId_notificationType_key" ON "UserNotificationPreference"("tenantId", "userId", "notificationType");

CREATE INDEX "UserNotificationPreference_tenantId_userId_idx" ON "UserNotificationPreference"("tenantId", "userId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
