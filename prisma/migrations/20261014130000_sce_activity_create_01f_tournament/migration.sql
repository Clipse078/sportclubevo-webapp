-- SCE-ACTIVITY-CREATE-01F — Tournament composer drafts + tournament approve permission

CREATE TABLE "TournamentComposerDraft" (
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

    CONSTRAINT "TournamentComposerDraft_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SceActivityGovernanceRevision" ADD COLUMN "tournamentDraftId" TEXT;

CREATE INDEX "TournamentComposerDraft_tenantId_lifecycleState_idx" ON "TournamentComposerDraft"("tenantId", "lifecycleState");
CREATE INDEX "TournamentComposerDraft_tenantId_createdByPersonId_idx" ON "TournamentComposerDraft"("tenantId", "createdByPersonId");

CREATE UNIQUE INDEX "SceActivityGovernanceRevision_tournamentDraftId_revisionNumber_key" ON "SceActivityGovernanceRevision"("tournamentDraftId", "revisionNumber");

ALTER TABLE "TournamentComposerDraft" ADD CONSTRAINT "TournamentComposerDraft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SceActivityGovernanceRevision" ADD CONSTRAINT "SceActivityGovernanceRevision_tournamentDraftId_fkey" FOREIGN KEY ("tournamentDraftId") REFERENCES "TournamentComposerDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Permission" ("id", "key", "name", "module", "scope", "grantableByAdmin", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'activities.tournament.approve', 'Tournament — approve / reject submissions', 'EVENTS', 'TENANT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "SceActivityGovernanceTypeConfig" ("id", "tenantId", "activityType", "defaultPublicationAuthority", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'TOURNAMENT', 'DIRECT_PUBLISH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
  AND p."key" = 'activities.tournament.approve'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
