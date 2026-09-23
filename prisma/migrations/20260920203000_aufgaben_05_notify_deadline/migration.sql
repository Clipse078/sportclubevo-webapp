-- AUFGABEN-05-NOTIFY-DEADLINE — participation RSVP deadlines + reminders (additive, nullable)

-- AlterEnum (conditional for empty-database replay before notification foundation exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationCategory') THEN
    ALTER TYPE "NotificationCategory" ADD VALUE IF NOT EXISTS 'PARTICIPATION';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PARTICIPATION_REMINDER';
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PARTICIPATION_OVERDUE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationEntityType') THEN
    ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'TRAINING_SESSION';
    ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'EVENT';
  END IF;
END $$;

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
