-- SCE-CD-05 PKG-05 — minimal club-wide strategy authoring (additive).

CREATE TYPE "ClubStrategyDocumentKind" AS ENUM ('LEITBILD', 'STRATEGY_AGREED', 'SUPPORTING');

CREATE TABLE "ClubStrategy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "situationText" TEXT,
    "alignmentText" TEXT,
    "responsiblePersonId" TEXT,
    "responsibleLabel" TEXT,
    "periodLabel" TEXT,
    "periodStartsAt" TIMESTAMP(3),
    "periodEndsAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "linkedMeetingRefs" JSONB,
    "contentRevision" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubStrategy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubStrategyFocusTarget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clubStrategyId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubStrategyFocusTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubStrategyDocumentReference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clubStrategyId" TEXT NOT NULL,
    "kind" "ClubStrategyDocumentKind" NOT NULL,
    "workspaceDocumentVersionId" TEXT NOT NULL,
    "versionBinding" "TaskDocumentReferenceVersionBinding" NOT NULL DEFAULT 'EXACT',
    "documentId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubStrategyDocumentReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubStrategy_tenantId_key" ON "ClubStrategy"("tenantId");
CREATE INDEX "ClubStrategy_tenantId_idx" ON "ClubStrategy"("tenantId");

CREATE UNIQUE INDEX "ClubStrategyFocusTarget_clubStrategyId_targetId_key" ON "ClubStrategyFocusTarget"("clubStrategyId", "targetId");
CREATE INDEX "ClubStrategyFocusTarget_tenantId_idx" ON "ClubStrategyFocusTarget"("tenantId");
CREATE INDEX "ClubStrategyFocusTarget_clubStrategyId_sortOrder_idx" ON "ClubStrategyFocusTarget"("clubStrategyId", "sortOrder");

CREATE UNIQUE INDEX "ClubStrategyDocumentReference_clubStrategyId_workspaceDocument_key" ON "ClubStrategyDocumentReference"("clubStrategyId", "workspaceDocumentVersionId");
CREATE INDEX "ClubStrategyDocumentReference_tenantId_idx" ON "ClubStrategyDocumentReference"("tenantId");
CREATE INDEX "ClubStrategyDocumentReference_clubStrategyId_kind_idx" ON "ClubStrategyDocumentReference"("clubStrategyId", "kind");
CREATE INDEX "ClubStrategyDocumentReference_tenantId_workspaceDocumentVersio_idx" ON "ClubStrategyDocumentReference"("tenantId", "workspaceDocumentVersionId");

ALTER TABLE "ClubStrategy" ADD CONSTRAINT "ClubStrategy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubStrategyFocusTarget" ADD CONSTRAINT "ClubStrategyFocusTarget_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyFocusTarget" ADD CONSTRAINT "ClubStrategyFocusTarget_clubStrategyId_fkey" FOREIGN KEY ("clubStrategyId") REFERENCES "ClubStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyFocusTarget" ADD CONSTRAINT "ClubStrategyFocusTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClubStrategyDocumentReference" ADD CONSTRAINT "ClubStrategyDocumentReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyDocumentReference" ADD CONSTRAINT "ClubStrategyDocumentReference_clubStrategyId_fkey" FOREIGN KEY ("clubStrategyId") REFERENCES "ClubStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyDocumentReference" ADD CONSTRAINT "ClubStrategyDocumentReference_workspaceDocumentVersionId_fkey" FOREIGN KEY ("workspaceDocumentVersionId") REFERENCES "WorkspaceDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyDocumentReference" ADD CONSTRAINT "ClubStrategyDocumentReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "WorkspaceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubStrategyDocumentReference" ADD CONSTRAINT "ClubStrategyDocumentReference_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;