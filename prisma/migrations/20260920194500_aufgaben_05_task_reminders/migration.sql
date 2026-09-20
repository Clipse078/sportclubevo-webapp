-- AUFGABEN-05 — task deadline reminders (additive, nullable).

ALTER TYPE "NotificationType" ADD VALUE 'TASK_REMINDER';

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
