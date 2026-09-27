-- SCE-COMM-10 — Event communication & smart reminders (additive)

-- CreateEnum
CREATE TYPE "PlatformCommunicationReminderOrigin" AS ENUM ('EVENT_NO_RESPONSE', 'POLL_NO_RESPONSE', 'REQUEST_NO_RESPONSE', 'REQUEST_OPEN_CAPACITY');

-- CreateEnum
CREATE TYPE "CommunicationReminderScheduleStatus" AS ENUM ('SCHEDULED', 'EXECUTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "PlatformCommunication" ADD COLUMN "orchestrationMetaJson" JSONB;

-- CreateTable
CREATE TABLE "CommunicationReminderExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "executionIdentity" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationReminderExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationReminderSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reminderOrigin" "PlatformCommunicationReminderOrigin" NOT NULL,
    "sourceReferenceJson" JSONB NOT NULL,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "CommunicationReminderScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "executionIdentity" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationReminderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationReminderExecution_communicationId_key" ON "CommunicationReminderExecution"("communicationId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationReminderExecution_tenantId_executionIdentity_key" ON "CommunicationReminderExecution"("tenantId", "executionIdentity");

-- CreateIndex
CREATE INDEX "CommunicationReminderExecution_tenantId_createdAt_idx" ON "CommunicationReminderExecution"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationReminderSchedule_tenantId_executionIdentity_key" ON "CommunicationReminderSchedule"("tenantId", "executionIdentity");

-- CreateIndex
CREATE INDEX "CommunicationReminderSchedule_tenantId_status_executeAt_idx" ON "CommunicationReminderSchedule"("tenantId", "status", "executeAt");

-- CreateIndex
CREATE INDEX "CommunicationReminderSchedule_tenantId_teamId_idx" ON "CommunicationReminderSchedule"("tenantId", "teamId");

-- AddForeignKey
ALTER TABLE "CommunicationReminderExecution" ADD CONSTRAINT "CommunicationReminderExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationReminderExecution" ADD CONSTRAINT "CommunicationReminderExecution_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationReminderSchedule" ADD CONSTRAINT "CommunicationReminderSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationReminderSchedule" ADD CONSTRAINT "CommunicationReminderSchedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationReminderSchedule" ADD CONSTRAINT "CommunicationReminderSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
