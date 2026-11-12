-- SCE-CD-03R2 — initiative/process ownership, optional approvals

CREATE TYPE "ClubDevelopmentProcessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

ALTER TABLE "Initiative" ADD COLUMN "ownerPersonId" TEXT;
ALTER TABLE "Initiative" ADD COLUMN "approvalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Initiative" ADD COLUMN "approvalRule" "MeetingApprovalRule" NOT NULL DEFAULT 'ALL';
ALTER TABLE "Initiative" ADD COLUMN "approverPersonIds" JSONB;
ALTER TABLE "Initiative" ADD COLUMN "approvalStatus" "MeetingApprovalAggregateStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE "Initiative" ADD COLUMN "approvalContentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Initiative" ADD COLUMN "approvedContentHash" TEXT;

CREATE TABLE "InitiativeApprovalVote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "approverPersonId" TEXT NOT NULL,
    "decision" "MeetingApprovalDecisionKind" NOT NULL,
    "comment" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientRequestId" TEXT,

    CONSTRAINT "InitiativeApprovalVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubDevelopmentProcess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "status" "ClubDevelopmentProcessStatus" NOT NULL DEFAULT 'DRAFT',
    "owner" TEXT,
    "ownerPersonId" TEXT,
    "documentRevision" INTEGER NOT NULL DEFAULT 1,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "approvalRule" "MeetingApprovalRule" NOT NULL DEFAULT 'ALL',
    "approverPersonIds" JSONB,
    "approvalStatus" "MeetingApprovalAggregateStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approvalContentRevision" INTEGER NOT NULL DEFAULT 1,
    "approvedContentHash" TEXT,
    "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'ORGANISATION',
    "createdByUserId" TEXT,
    "visibleRoleRefs" JSONB,
    "visibleUserRefs" JSONB,
    "visibleOrgUnitRefs" JSONB,
    "visibleTargetGroupRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubDevelopmentProcess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubDevelopmentProcessApprovalVote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "approverPersonId" TEXT NOT NULL,
    "decision" "MeetingApprovalDecisionKind" NOT NULL,
    "comment" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientRequestId" TEXT,

    CONSTRAINT "ClubDevelopmentProcessApprovalVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InitiativeApprovalVote_initiativeId_approverPersonId_key" ON "InitiativeApprovalVote"("initiativeId", "approverPersonId");
CREATE INDEX "InitiativeApprovalVote_tenantId_initiativeId_idx" ON "InitiativeApprovalVote"("tenantId", "initiativeId");

CREATE UNIQUE INDEX "ClubDevelopmentProcess_tenantId_slug_key" ON "ClubDevelopmentProcess"("tenantId", "slug");
CREATE INDEX "ClubDevelopmentProcess_tenantId_idx" ON "ClubDevelopmentProcess"("tenantId");
CREATE INDEX "ClubDevelopmentProcess_status_idx" ON "ClubDevelopmentProcess"("status");

CREATE UNIQUE INDEX "ClubDevelopmentProcessApprovalVote_processId_approverPersonId_key" ON "ClubDevelopmentProcessApprovalVote"("processId", "approverPersonId");
CREATE INDEX "ClubDevelopmentProcessApprovalVote_tenantId_processId_idx" ON "ClubDevelopmentProcessApprovalVote"("tenantId", "processId");

ALTER TABLE "InitiativeApprovalVote" ADD CONSTRAINT "InitiativeApprovalVote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InitiativeApprovalVote" ADD CONSTRAINT "InitiativeApprovalVote_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubDevelopmentProcess" ADD CONSTRAINT "ClubDevelopmentProcess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubDevelopmentProcessApprovalVote" ADD CONSTRAINT "ClubDevelopmentProcessApprovalVote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubDevelopmentProcessApprovalVote" ADD CONSTRAINT "ClubDevelopmentProcessApprovalVote_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ClubDevelopmentProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
