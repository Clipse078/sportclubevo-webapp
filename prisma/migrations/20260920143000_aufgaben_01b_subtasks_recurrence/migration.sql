-- AUFGABEN-01B — subtasks + recurring task foundation

-- CreateEnum
CREATE TYPE "TaskSeriesStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "TaskRecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TaskRecurrenceMode" AS ENUM ('ON_SCHEDULE', 'AFTER_COMPLETION');

-- CreateEnum
CREATE TYPE "TaskSeriesWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "taskSeriesId" TEXT,
ADD COLUMN     "seriesOccurrenceKey" TEXT;

-- CreateTable
CREATE TABLE "TaskSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "TaskRecurrenceFrequency" NOT NULL,
    "mode" "TaskRecurrenceMode" NOT NULL DEFAULT 'ON_SCHEDULE',
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "weekday" "TaskSeriesWeekday",
    "monthDay" INTEGER,
    "dueHour" INTEGER NOT NULL DEFAULT 23,
    "dueMinute" INTEGER NOT NULL DEFAULT 59,
    "timezone" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSeriesAssigneeTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskSeriesAssigneeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSeriesSubtaskTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "dueOffsetDays" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaskSeriesSubtaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSeriesSubtaskAssigneeTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskSeriesSubtaskAssigneeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Task_taskSeriesId_idx" ON "Task"("taskSeriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_tenantId_seriesOccurrenceKey_key" ON "Task"("tenantId", "seriesOccurrenceKey");

-- CreateIndex
CREATE INDEX "TaskSeries_tenantId_idx" ON "TaskSeries"("tenantId");

-- CreateIndex
CREATE INDEX "TaskSeries_tenantId_status_idx" ON "TaskSeries"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TaskSeriesAssigneeTemplate_tenantId_seriesId_idx" ON "TaskSeriesAssigneeTemplate"("tenantId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSeriesAssigneeTemplate_seriesId_userId_key" ON "TaskSeriesAssigneeTemplate"("seriesId", "userId");

-- CreateIndex
CREATE INDEX "TaskSeriesSubtaskTemplate_tenantId_seriesId_orderIndex_idx" ON "TaskSeriesSubtaskTemplate"("tenantId", "seriesId", "orderIndex");

-- CreateIndex
CREATE INDEX "TaskSeriesSubtaskAssigneeTemplate_tenantId_templateId_idx" ON "TaskSeriesSubtaskAssigneeTemplate"("tenantId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSeriesSubtaskAssigneeTemplate_templateId_userId_key" ON "TaskSeriesSubtaskAssigneeTemplate"("templateId", "userId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskSeriesId_fkey" FOREIGN KEY ("taskSeriesId") REFERENCES "TaskSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeries" ADD CONSTRAINT "TaskSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeries" ADD CONSTRAINT "TaskSeries_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesAssigneeTemplate" ADD CONSTRAINT "TaskSeriesAssigneeTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesAssigneeTemplate" ADD CONSTRAINT "TaskSeriesAssigneeTemplate_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TaskSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesAssigneeTemplate" ADD CONSTRAINT "TaskSeriesAssigneeTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesSubtaskTemplate" ADD CONSTRAINT "TaskSeriesSubtaskTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesSubtaskTemplate" ADD CONSTRAINT "TaskSeriesSubtaskTemplate_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TaskSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesSubtaskAssigneeTemplate" ADD CONSTRAINT "TaskSeriesSubtaskAssigneeTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesSubtaskAssigneeTemplate" ADD CONSTRAINT "TaskSeriesSubtaskAssigneeTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskSeriesSubtaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSeriesSubtaskAssigneeTemplate" ADD CONSTRAINT "TaskSeriesSubtaskAssigneeTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
