-- SCE-COMM-08 — Team requests & Helfereinsätze (additive)

CREATE TYPE "PlatformCommunicationRequestLifecycle" AS ENUM ('OPEN', 'CLOSED');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TEAM_REQUEST_PUBLISHED';

CREATE TABLE "PlatformCommunicationRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "lifecycle" "PlatformCommunicationRequestLifecycle" NOT NULL DEFAULT 'OPEN',
    "deadlineAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationRequestSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "requiredCapacity" INTEGER NOT NULL DEFAULT 1,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationRequestSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformCommunicationRequestClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "recipientSnapshotId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCommunicationRequestClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformCommunicationRequest_communicationId_key" ON "PlatformCommunicationRequest"("communicationId");
CREATE INDEX "PlatformCommunicationRequest_tenantId_communicationId_idx" ON "PlatformCommunicationRequest"("tenantId", "communicationId");
CREATE INDEX "PlatformCommunicationRequest_tenantId_lifecycle_idx" ON "PlatformCommunicationRequest"("tenantId", "lifecycle");
CREATE INDEX "PlatformCommunicationRequest_tenantId_eventId_idx" ON "PlatformCommunicationRequest"("tenantId", "eventId");

CREATE UNIQUE INDEX "PlatformCommunicationRequestSlot_requestId_sortOrder_key" ON "PlatformCommunicationRequestSlot"("requestId", "sortOrder");
CREATE INDEX "PlatformCommunicationRequestSlot_tenantId_requestId_sortOrder_idx" ON "PlatformCommunicationRequestSlot"("tenantId", "requestId", "sortOrder");

CREATE UNIQUE INDEX "PlatformCommunicationRequestClaim_slotId_recipientSnapshotId_key" ON "PlatformCommunicationRequestClaim"("slotId", "recipientSnapshotId");
CREATE INDEX "PlatformCommunicationRequestClaim_tenantId_slotId_idx" ON "PlatformCommunicationRequestClaim"("tenantId", "slotId");
CREATE INDEX "PlatformCommunicationRequestClaim_tenantId_slotId_recipientSnapshotId_idx" ON "PlatformCommunicationRequestClaim"("tenantId", "slotId", "recipientSnapshotId");
CREATE INDEX "PlatformCommunicationRequestClaim_recipientSnapshotId_idx" ON "PlatformCommunicationRequestClaim"("recipientSnapshotId");

ALTER TABLE "PlatformCommunicationRequest" ADD CONSTRAINT "PlatformCommunicationRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationRequest" ADD CONSTRAINT "PlatformCommunicationRequest_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "PlatformCommunication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationRequest" ADD CONSTRAINT "PlatformCommunicationRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRequestSlot" ADD CONSTRAINT "PlatformCommunicationRequestSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationRequestSlot" ADD CONSTRAINT "PlatformCommunicationRequestSlot_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PlatformCommunicationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformCommunicationRequestClaim" ADD CONSTRAINT "PlatformCommunicationRequestClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationRequestClaim" ADD CONSTRAINT "PlatformCommunicationRequestClaim_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PlatformCommunicationRequestSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformCommunicationRequestClaim" ADD CONSTRAINT "PlatformCommunicationRequestClaim_recipientSnapshotId_fkey" FOREIGN KEY ("recipientSnapshotId") REFERENCES "PlatformCommunicationRecipientSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
