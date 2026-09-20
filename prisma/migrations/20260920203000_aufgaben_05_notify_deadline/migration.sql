-- AUFGABEN-05-NOTIFY-DEADLINE — participation RSVP deadlines + reminders (additive, nullable)

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'PARTICIPATION';
ALTER TYPE "NotificationType" ADD VALUE 'PARTICIPATION_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'PARTICIPATION_OVERDUE';
ALTER TYPE "NotificationEntityType" ADD VALUE 'TRAINING_SESSION';
ALTER TYPE "NotificationEntityType" ADD VALUE 'EVENT';

-- AlterTable Event
ALTER TABLE "Event" ADD COLUMN "participationResponseDueAt" TIMESTAMP(3),
ADD COLUMN "participationReminder1At" TIMESTAMP(3),
ADD COLUMN "participationReminder2At" TIMESTAMP(3),
ADD COLUMN "participationReminder1PresetKey" TEXT,
ADD COLUMN "participationReminder2PresetKey" TEXT;

-- AlterTable TrainingSeries
ALTER TABLE "TrainingSeries" ADD COLUMN "participationResponseDueDaysBefore" INTEGER,
ADD COLUMN "participationResponseDueLocalTime" TEXT,
ADD COLUMN "participationReminder1PresetKey" TEXT,
ADD COLUMN "participationReminder2PresetKey" TEXT;

-- AlterTable TrainingSession
ALTER TABLE "TrainingSession" ADD COLUMN "participationResponseDueAt" TIMESTAMP(3),
ADD COLUMN "participationReminder1At" TIMESTAMP(3),
ADD COLUMN "participationReminder2At" TIMESTAMP(3),
ADD COLUMN "participationReminder1PresetKey" TEXT,
ADD COLUMN "participationReminder2PresetKey" TEXT;

-- CreateIndex
CREATE INDEX "Event_tenantId_participationResponseDueAt_idx" ON "Event"("tenantId", "participationResponseDueAt");
CREATE INDEX "Event_tenantId_participationReminder1At_idx" ON "Event"("tenantId", "participationReminder1At");
CREATE INDEX "Event_tenantId_participationReminder2At_idx" ON "Event"("tenantId", "participationReminder2At");
CREATE INDEX "TrainingSession_tenantId_participationResponseDueAt_idx" ON "TrainingSession"("tenantId", "participationResponseDueAt");
CREATE INDEX "TrainingSession_tenantId_participationReminder1At_idx" ON "TrainingSession"("tenantId", "participationReminder1At");
CREATE INDEX "TrainingSession_tenantId_participationReminder2At_idx" ON "TrainingSession"("tenantId", "participationReminder2At");
