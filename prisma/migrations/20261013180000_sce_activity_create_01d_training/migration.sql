-- SCE-ACTIVITY-CREATE-01D — Training composer drafts + training approve permission

CREATE TABLE "TrainingComposerDraft" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByPersonId" TEXT NOT NULL,
    "updatedByPersonId" TEXT,
    "lifecycleState" "SceActivityGovernanceLifecycleState" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "draftResourceSelections" JSONB NOT NULL DEFAULT '[]',
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3),
    "publishedPrimarySeriesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingComposerDraft_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SceActivityGovernanceRevision" ADD COLUMN "trainingDraftId" TEXT;

CREATE INDEX "TrainingComposerDraft_tenantId_lifecycleState_idx" ON "TrainingComposerDraft"("tenantId", "lifecycleState");
CREATE INDEX "TrainingComposerDraft_tenantId_createdByPersonId_idx" ON "TrainingComposerDraft"("tenantId", "createdByPersonId");

CREATE UNIQUE INDEX "SceActivityGovernanceRevision_trainingDraftId_revisionNumber_key" ON "SceActivityGovernanceRevision"("trainingDraftId", "revisionNumber");

ALTER TABLE "TrainingComposerDraft" ADD CONSTRAINT "TrainingComposerDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceRevision" ADD CONSTRAINT "SceActivityGovernanceRevision_trainingDraftId_fkey" FOREIGN KEY ("trainingDraftId") REFERENCES "TrainingComposerDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'activities.training.approve', 'Training — approve / reject submissions', 'TRAININGS', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SceActivityGovernanceTypeConfig" ("id", "tenantId", "activityType", "defaultPublicationAuthority", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'TRAINING', 'DIRECT_PUBLISH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId", "activityType") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "permissionId", "createdAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  p."id",
  CURRENT_TIMESTAMP
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."key" LIKE 'club_admin__%'
  AND r."scope" = 'TENANT'
  AND r."isSystem" = true
  AND r."isArchived" = false
  AND p."key" = 'activities.training.approve'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
