-- SCE-COMM-07 — Team polls & date polls (additive)

CREATE TYPE "PlatformCommunicationPollMode" AS ENUM ('SINGLE', 'MULTIPLE');
CREATE TYPE "PlatformCommunicationPollResultsVisibility" AS ENUM ('AFTER_RESPONSE', 'AFTER_CLOSE', 'SENDER_ONLY');
CREATE TYPE "PlatformCommunicationPollLifecycle" AS ENUM ('OPEN', 'CLOSED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_POLL_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_DATE_POLL_PUBLISHED';

CREATE TABLE "PlatformCommunicationPoll" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "mode" "PlatformCommunicationPollMode" NOT NULL DEFAULT 'SINGLE',
    "resultsVisibility" "PlatformCommunicationPollResultsVisibility" NOT NULL DEFAULT 'AFTER_CLOSE',
    "lifecycle" "PlatformCommunicationPollLifecycle" NOT NULL DEFAULT 'OPEN',
    "deadlineAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "selectedOptionId" TEXT,
    "createdEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationPollOption" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationPollResponse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "recipientSnapshotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationPollResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationPoll_communicationId_key" ON "PlatformCommunicationPoll"("communicationId");
CREATE INDEX "PlatformCommunicationPoll_tenantId_communicationId_idx" ON "PlatformCommunicationPoll"("tenantId", "communicationId");
CREATE INDEX "PlatformCommunicationPoll_tenantId_lifecycle_idx" ON "PlatformCommunicationPoll"("tenantId", "lifecycle");
CREATE INDEX "PlatformCommunicationPoll_tenantId_createdEventId_idx" ON "PlatformCommunicationPoll"("tenantId", "createdEventId");
CREATE INDEX "PlatformCommunicationPoll_tenantId_selectedOptionId_idx" ON "PlatformCommunicationPoll"("tenantId", "selectedOptionId");

CREATE UNIQUE INDEX "PlatformCommunicationPollOption_pollId_sortOrder_key" ON "PlatformCommunicationPollOption"("pollId", "sortOrder");
CREATE INDEX "PlatformCommunicationPollOption_tenantId_pollId_sortOrder_idx" ON "PlatformCommunicationPollOption"("tenantId", "pollId", "sortOrder");

CREATE UNIQUE INDEX "PlatformCommunicationPollResponse_pollId_recipientSnapshotId_optionId_key" ON "PlatformCommunicationPollResponse"("pollId", "recipientSnapshotId", "optionId");
CREATE INDEX "PlatformCommunicationPollResponse_tenantId_pollId_idx" ON "PlatformCommunicationPollResponse"("tenantId", "pollId");
CREATE INDEX "PlatformCommunicationPollResponse_tenantId_pollId_recipientSnapshotId_idx" ON "PlatformCommunicationPollResponse"("tenantId", "pollId", "recipientSnapshotId");
CREATE INDEX "PlatformCommunicationPollResponse_tenantId_optionId_idx" ON "PlatformCommunicationPollResponse"("tenantId", "optionId");
CREATE INDEX "PlatformCommunicationPollResponse_recipientSnapshotId_idx" ON "PlatformCommunicationPollResponse"("recipientSnapshotId");

ALTER TABLE "PlatformCommunicationPoll" ADD CONSTRAINT "PlatformCommunicationPoll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPoll" ADD CONSTRAINT "PlatformCommunicationPoll_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPoll" ADD CONSTRAINT "PlatformCommunicationPoll_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "PlatformCommunicationPollOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPoll" ADD CONSTRAINT "PlatformCommunicationPoll_createdEventId_fkey" FOREIGN KEY ("createdEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPollOption" ADD CONSTRAINT "PlatformCommunicationPollOption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPollOption" ADD CONSTRAINT "PlatformCommunicationPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PlatformCommunicationPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationPollResponse" ADD CONSTRAINT "PlatformCommunicationPollResponse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPollResponse" ADD CONSTRAINT "PlatformCommunicationPollResponse_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PlatformCommunicationPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPollResponse" ADD CONSTRAINT "PlatformCommunicationPollResponse_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PlatformCommunicationPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationPollResponse" ADD CONSTRAINT "PlatformCommunicationPollResponse_recipientSnapshotId_fkey" FOREIGN KEY ("recipientSnapshotId") REFERENCES "PlatformCommunicationRecipientSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
