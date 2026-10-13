-- SCE-ACTIVITY-CREATE-01E — Match composer drafts + match approve permission

CREATE TABLE "MatchComposerDraft" (
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

    CONSTRAINT "MatchComposerDraft_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SceActivityGovernanceRevision" ADD COLUMN "matchDraftId" TEXT;

CREATE INDEX "MatchComposerDraft_tenantId_lifecycleState_idx" ON "MatchComposerDraft"("tenantId", "lifecycleState");
CREATE INDEX "MatchComposerDraft_tenantId_createdByPersonId_idx" ON "MatchComposerDraft"("tenantId", "createdByPersonId");

CREATE UNIQUE INDEX "SceActivityGovernanceRevision_matchDraftId_revisionNumber_key" ON "SceActivityGovernanceRevision"("matchDraftId", "revisionNumber");

ALTER TABLE "MatchComposerDraft" ADD CONSTRAINT "MatchComposerDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceRevision" ADD CONSTRAINT "SceActivityGovernanceRevision_matchDraftId_fkey" FOREIGN KEY ("matchDraftId") REFERENCES "MatchComposerDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'activities.match.approve', 'Match — approve / reject submissions', 'EVENTS', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SceActivityGovernanceTypeConfig" ("id", "tenantId", "activityType", "defaultPublicationAuthority", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'MATCH', 'DIRECT_PUBLISH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
  AND p."key" = 'activities.match.approve'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
