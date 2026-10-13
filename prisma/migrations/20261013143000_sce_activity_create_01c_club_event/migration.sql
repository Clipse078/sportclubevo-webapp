-- SCE-ACTIVITY-CREATE-01C — Club Event composer drafts + reusable activity governance persistence

CREATE TYPE "SceActivityGovernanceActivityType" AS ENUM ('TRAINING', 'MATCH', 'TOURNAMENT', 'CLUB_EVENT');
CREATE TYPE "SceActivityPublicationAuthorityMode" AS ENUM ('DIRECT_PUBLISH', 'APPROVAL_REQUIRED');
CREATE TYPE "SceActivityGovernanceLifecycleState" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'CHANGES_REQUESTED', 'REJECTED', 'PUBLISHED');
CREATE TYPE "SceActivityApprovalDecisionType" AS ENUM ('APPROVE', 'REQUEST_CHANGES', 'REJECT');

CREATE TABLE "SceActivityGovernanceTypeConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityType" "SceActivityGovernanceActivityType" NOT NULL,
    "defaultPublicationAuthority" "SceActivityPublicationAuthorityMode" NOT NULL DEFAULT 'DIRECT_PUBLISH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceActivityGovernanceTypeConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SceActivityGovernanceCreatorPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "typeConfigId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicationAuthority" "SceActivityPublicationAuthorityMode",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceActivityGovernanceCreatorPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SceActivityGovernanceValidator" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "typeConfigId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceActivityGovernanceValidator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubEventComposerDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByPersonId" TEXT NOT NULL,
    "updatedByPersonId" TEXT,
    "lifecycleState" "SceActivityGovernanceLifecycleState" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "draftResourceSelections" JSONB NOT NULL DEFAULT '[]',
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "publishedPrimaryEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEventComposerDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SceActivityGovernanceRevision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityType" "SceActivityGovernanceActivityType" NOT NULL,
    "clubEventDraftId" TEXT,
    "domainPublishedEventId" TEXT,
    "revisionNumber" INTEGER NOT NULL,
    "lifecycleState" "SceActivityGovernanceLifecycleState" NOT NULL,
    "creatorPersonId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "policySnapshot" JSONB NOT NULL,
    "payloadSnapshot" JSONB NOT NULL,
    "isCurrentSubmission" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceActivityGovernanceRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SceActivityGovernanceDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "decision" "SceActivityApprovalDecisionType" NOT NULL,
    "approverPersonId" TEXT NOT NULL,
    "comment" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SceActivityGovernanceDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SceActivityGovernanceTypeConfig_tenantId_activityType_key" ON "SceActivityGovernanceTypeConfig"("tenantId", "activityType");
CREATE INDEX "SceActivityGovernanceTypeConfig_tenantId_idx" ON "SceActivityGovernanceTypeConfig"("tenantId");

CREATE UNIQUE INDEX "SceActivityGovernanceCreatorPolicy_typeConfigId_personId_key" ON "SceActivityGovernanceCreatorPolicy"("typeConfigId", "personId");
CREATE INDEX "SceActivityGovernanceCreatorPolicy_tenantId_personId_idx" ON "SceActivityGovernanceCreatorPolicy"("tenantId", "personId");

CREATE UNIQUE INDEX "SceActivityGovernanceValidator_typeConfigId_personId_key" ON "SceActivityGovernanceValidator"("typeConfigId", "personId");
CREATE INDEX "SceActivityGovernanceValidator_tenantId_personId_idx" ON "SceActivityGovernanceValidator"("tenantId", "personId");

CREATE INDEX "ClubEventComposerDraft_tenantId_lifecycleState_idx" ON "ClubEventComposerDraft"("tenantId", "lifecycleState");
CREATE INDEX "ClubEventComposerDraft_tenantId_createdByPersonId_idx" ON "ClubEventComposerDraft"("tenantId", "createdByPersonId");

CREATE UNIQUE INDEX "SceActivityGovernanceRevision_clubEventDraftId_revisionNumber_key" ON "SceActivityGovernanceRevision"("clubEventDraftId", "revisionNumber");
CREATE INDEX "SceActivityGovernanceRevision_tenantId_activityType_lifecycleState_idx" ON "SceActivityGovernanceRevision"("tenantId", "activityType", "lifecycleState");
CREATE INDEX "SceActivityGovernanceRevision_tenantId_isCurrentSubmission_lifecycleState_idx" ON "SceActivityGovernanceRevision"("tenantId", "isCurrentSubmission", "lifecycleState");

CREATE UNIQUE INDEX "SceActivityGovernanceDecision_revisionId_approverPersonId_decision_key" ON "SceActivityGovernanceDecision"("revisionId", "approverPersonId", "decision");
CREATE INDEX "SceActivityGovernanceDecision_tenantId_revisionId_idx" ON "SceActivityGovernanceDecision"("tenantId", "revisionId");

ALTER TABLE "SceActivityGovernanceTypeConfig" ADD CONSTRAINT "SceActivityGovernanceTypeConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceCreatorPolicy" ADD CONSTRAINT "SceActivityGovernanceCreatorPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceCreatorPolicy" ADD CONSTRAINT "SceActivityGovernanceCreatorPolicy_typeConfigId_fkey" FOREIGN KEY ("typeConfigId") REFERENCES "SceActivityGovernanceTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceValidator" ADD CONSTRAINT "SceActivityGovernanceValidator_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceValidator" ADD CONSTRAINT "SceActivityGovernanceValidator_typeConfigId_fkey" FOREIGN KEY ("typeConfigId") REFERENCES "SceActivityGovernanceTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventComposerDraft" ADD CONSTRAINT "ClubEventComposerDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceRevision" ADD CONSTRAINT "SceActivityGovernanceRevision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceRevision" ADD CONSTRAINT "SceActivityGovernanceRevision_clubEventDraftId_fkey" FOREIGN KEY ("clubEventDraftId") REFERENCES "ClubEventComposerDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceDecision" ADD CONSTRAINT "SceActivityGovernanceDecision_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceDecision" ADD CONSTRAINT "SceActivityGovernanceDecision_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "SceActivityGovernanceRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'activities.club_event.approve', 'Club events — approve / reject submissions', 'EVENTS', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Default DIRECT_PUBLISH type config for existing tenants (backfill).
INSERT INTO "SceActivityGovernanceTypeConfig" ("id", "tenantId", "activityType", "defaultPublicationAuthority", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'CLUB_EVENT', 'DIRECT_PUBLISH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId", "activityType") DO NOTHING;
