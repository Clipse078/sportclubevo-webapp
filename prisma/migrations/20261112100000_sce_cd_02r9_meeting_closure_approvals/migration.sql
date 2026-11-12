-- SCE-CD-02R9 — meeting closure, optional approvals, lifecycle audit

CREATE TYPE "MeetingApprovalRule" AS ENUM ('ALL', 'ONE', 'MAJORITY');

CREATE TYPE "MeetingApprovalDecisionKind" AS ENUM ('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

CREATE TYPE "MeetingApprovalAggregateStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

CREATE TYPE "MeetingLifecycleEventKind" AS ENUM ('CONDUCTED', 'PROTOCOL_SUBMITTED', 'CLOSED', 'REOPENED', 'CANCELLED');

ALTER TABLE "Meeting" ADD COLUMN "conductedAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN "conductedByUserId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN "closedByUserId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "lastReopenReason" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "protocolContentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Meeting" ADD COLUMN "protocolApprovalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Meeting" ADD COLUMN "protocolApprovalRule" "MeetingApprovalRule" NOT NULL DEFAULT 'ALL';
ALTER TABLE "Meeting" ADD COLUMN "protocolApproverPersonIds" JSONB;
ALTER TABLE "Meeting" ADD COLUMN "protocolApprovedContentHash" TEXT;

ALTER TABLE "MeetingDecision" ADD COLUMN "sourceAgendaItemId" TEXT;
ALTER TABLE "MeetingDecision" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MeetingDecision" ADD COLUMN "approvalRule" "MeetingApprovalRule" NOT NULL DEFAULT 'ALL';
ALTER TABLE "MeetingDecision" ADD COLUMN "approverPersonIds" JSONB;
ALTER TABLE "MeetingDecision" ADD COLUMN "approvalStatus" "MeetingApprovalAggregateStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "MeetingDecision" ADD COLUMN "approvalContentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MeetingDecision" ADD COLUMN "approvedContentHash" TEXT;

CREATE TABLE "MeetingDecisionApprovalVote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "approverPersonId" TEXT NOT NULL,
    "decision" "MeetingApprovalDecisionKind" NOT NULL,
    "comment" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientRequestId" TEXT,

    CONSTRAINT "MeetingDecisionApprovalVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingProtocolApprovalVote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "approverPersonId" TEXT NOT NULL,
    "decision" "MeetingApprovalDecisionKind" NOT NULL,
    "comment" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientRequestId" TEXT,

    CONSTRAINT "MeetingProtocolApprovalVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MeetingLifecycleEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "kind" "MeetingLifecycleEventKind" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MeetingDecisionApprovalVote_decisionId_approverPersonId_key" ON "MeetingDecisionApprovalVote"("decisionId", "approverPersonId");
CREATE INDEX "MeetingDecisionApprovalVote_tenantId_decisionId_idx" ON "MeetingDecisionApprovalVote"("tenantId", "decisionId");

CREATE UNIQUE INDEX "MeetingProtocolApprovalVote_meetingId_approverPersonId_key" ON "MeetingProtocolApprovalVote"("meetingId", "approverPersonId");
CREATE INDEX "MeetingProtocolApprovalVote_tenantId_meetingId_idx" ON "MeetingProtocolApprovalVote"("tenantId", "meetingId");

CREATE INDEX "MeetingLifecycleEvent_tenantId_meetingId_createdAt_idx" ON "MeetingLifecycleEvent"("tenantId", "meetingId", "createdAt");
CREATE INDEX "MeetingLifecycleEvent_meetingId_kind_idx" ON "MeetingLifecycleEvent"("meetingId", "kind");

CREATE INDEX "MeetingDecision_sourceAgendaItemId_idx" ON "MeetingDecision"("sourceAgendaItemId");

ALTER TABLE "MeetingDecision" ADD CONSTRAINT "MeetingDecision_sourceAgendaItemId_fkey" FOREIGN KEY ("sourceAgendaItemId") REFERENCES "MeetingAgendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MeetingDecisionApprovalVote" ADD CONSTRAINT "MeetingDecisionApprovalVote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingDecisionApprovalVote" ADD CONSTRAINT "MeetingDecisionApprovalVote_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "MeetingDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MeetingProtocolApprovalVote" ADD CONSTRAINT "MeetingProtocolApprovalVote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingProtocolApprovalVote" ADD CONSTRAINT "MeetingProtocolApprovalVote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MeetingLifecycleEvent" ADD CONSTRAINT "MeetingLifecycleEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MeetingLifecycleEvent" ADD CONSTRAINT "MeetingLifecycleEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
