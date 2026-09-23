-- AUFGABEN-05 — task deadline reminders (additive, nullable).
-- NotificationType may not exist yet on empty-database replay (MIGRATION-ORDER-01);
-- TASK_REMINDER is created in aufgaben_04n_notification_foundation when replayed fresh.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_REMINDER';
  END IF;
END $$;

ALTER TABLE "Task" ADD COLUMN "reminder1At" TIMESTAMP(3),
ADD COLUMN "reminder2At" TIMESTAMP(3),
ADD COLUMN "reminder1PresetKey" TEXT,
ADD COLUMN "reminder2PresetKey" TEXT;

CREATE INDEX "Task_tenantId_status_reminder1At_idx" ON "Task"("tenantId", "status", "reminder1At");
CREATE INDEX "Task_tenantId_status_reminder2At_idx" ON "Task"("tenantId", "status", "reminder2At");

ALTER TABLE "TaskSeries" ADD COLUMN "reminder1PresetKey" TEXT,
ADD COLUMN "reminder2PresetKey" TEXT;

ALTER TABLE "TaskSeriesSubtaskTemplate" ADD COLUMN "reminder1PresetKey" TEXT,
ADD COLUMN "reminder2PresetKey" TEXT;
