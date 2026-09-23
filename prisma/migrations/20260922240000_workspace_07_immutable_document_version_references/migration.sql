-- WORKSPACE-07 — immutable WorkspaceDocumentVersion references (Tasks + Requirements).

CREATE TYPE "TaskDocumentReferenceVersionBinding" AS ENUM (
  'EXACT',
  'LEGACY_UNRESOLVED',
  'LEGACY_SINGLE_VERSION'
);

ALTER TABLE "TaskDocumentReference"
  ADD COLUMN "workspaceDocumentVersionId" TEXT,
  ADD COLUMN "versionBinding" "TaskDocumentReferenceVersionBinding" NOT NULL DEFAULT 'EXACT';

UPDATE "TaskDocumentReference"
SET "versionBinding" = 'LEGACY_UNRESOLVED'
WHERE "workspaceDocumentVersionId" IS NULL;

-- Deterministic backfill: document with exactly one version ever.
UPDATE "TaskDocumentReference" AS t
SET
  "workspaceDocumentVersionId" = v."id",
  "versionBinding" = 'LEGACY_SINGLE_VERSION'
FROM "WorkspaceDocumentVersion" AS v
INNER JOIN (
  SELECT "documentId"
  FROM "WorkspaceDocumentVersion"
  GROUP BY "documentId"
  HAVING COUNT(*) = 1
) AS single ON single."documentId" = v."documentId"
WHERE t."documentId" = v."documentId"
  AND t."workspaceDocumentVersionId" IS NULL;

ALTER TABLE "TaskDocumentReference" ALTER COLUMN "documentId" DROP NOT NULL;

DROP INDEX IF EXISTS "TaskDocumentReference_taskId_documentId_key";

CREATE UNIQUE INDEX "TaskDocumentReference_taskId_workspaceDocumentVersionId_key"
  ON "TaskDocumentReference"("taskId", "workspaceDocumentVersionId")
  WHERE "workspaceDocumentVersionId" IS NOT NULL;

CREATE UNIQUE INDEX "TaskDocumentReference_taskId_documentId_legacy_key"
  ON "TaskDocumentReference"("taskId", "documentId")
  WHERE "workspaceDocumentVersionId" IS NULL AND "documentId" IS NOT NULL;

CREATE INDEX "TaskDocumentReference_tenantId_workspaceDocumentVersionId_idx"
  ON "TaskDocumentReference"("tenantId", "workspaceDocumentVersionId");

ALTER TABLE "TaskDocumentReference"
  ADD CONSTRAINT "TaskDocumentReference_workspaceDocumentVersionId_fkey"
  FOREIGN KEY ("workspaceDocumentVersionId") REFERENCES "WorkspaceDocumentVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RequirementWorkspaceDocumentVersionReference" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "workspaceDocumentVersionId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RequirementWorkspaceDocumentVersionReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequirementWorkspaceDocumentVersionReference_requirementId_workspaceDocumentVersionId_key"
  ON "RequirementWorkspaceDocumentVersionReference"("requirementId", "workspaceDocumentVersionId");

CREATE INDEX "RequirementWorkspaceDocumentVersionReference_tenantId_idx"
  ON "RequirementWorkspaceDocumentVersionReference"("tenantId");

CREATE INDEX "RequirementWorkspaceDocumentVersionReference_tenantId_requirementId_idx"
  ON "RequirementWorkspaceDocumentVersionReference"("tenantId", "requirementId");

CREATE INDEX "RequirementWorkspaceDocumentVersionReference_tenantId_workspaceDocumentVersionId_idx"
  ON "RequirementWorkspaceDocumentVersionReference"("tenantId", "workspaceDocumentVersionId");

ALTER TABLE "RequirementWorkspaceDocumentVersionReference"
  ADD CONSTRAINT "RequirementWorkspaceDocumentVersionReference_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequirementWorkspaceDocumentVersionReference"
  ADD CONSTRAINT "RequirementWorkspaceDocumentVersionReference_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequirementWorkspaceDocumentVersionReference"
  ADD CONSTRAINT "RequirementWorkspaceDocumentVersionReference_workspaceDocumentVersionId_fkey"
  FOREIGN KEY ("workspaceDocumentVersionId") REFERENCES "WorkspaceDocumentVersion"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequirementWorkspaceDocumentVersionReference"
  ADD CONSTRAINT "RequirementWorkspaceDocumentVersionReference_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- WORKSPACE-07-A1 — transitional TaskDocumentReference binding invariants (defense in depth).
ALTER TABLE "TaskDocumentReference"
  ADD CONSTRAINT "TaskDocumentReference_version_binding_invariant" CHECK (
    (
      "versionBinding" = 'EXACT'::"TaskDocumentReferenceVersionBinding"
      AND "workspaceDocumentVersionId" IS NOT NULL
      AND "documentId" IS NULL
    )
    OR (
      "versionBinding" = 'LEGACY_UNRESOLVED'::"TaskDocumentReferenceVersionBinding"
      AND "documentId" IS NOT NULL
      AND "workspaceDocumentVersionId" IS NULL
    )
    OR (
      "versionBinding" = 'LEGACY_SINGLE_VERSION'::"TaskDocumentReferenceVersionBinding"
      AND "documentId" IS NOT NULL
      AND "workspaceDocumentVersionId" IS NOT NULL
    )
  );
