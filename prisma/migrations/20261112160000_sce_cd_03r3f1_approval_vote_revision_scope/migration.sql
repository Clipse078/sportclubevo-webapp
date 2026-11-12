-- SCE-CD-03R3F1 — revision-scoped initiative/process approval votes (preserve history on material edits).

DROP INDEX "InitiativeApprovalVote_initiativeId_approverPersonId_key";

ALTER TABLE "InitiativeApprovalVote" ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "InitiativeApprovalVote" ADD COLUMN "legacyRevisionUnscoped" BOOLEAN NOT NULL DEFAULT false;

UPDATE "InitiativeApprovalVote" SET "legacyRevisionUnscoped" = true;

CREATE UNIQUE INDEX "InitiativeApprovalVote_initiativeId_approverPersonId_contentRevision_key"
  ON "InitiativeApprovalVote"("initiativeId", "approverPersonId", "contentRevision");
CREATE INDEX "InitiativeApprovalVote_tenantId_initiativeId_contentRevision_idx"
  ON "InitiativeApprovalVote"("tenantId", "initiativeId", "contentRevision");

DROP INDEX "ClubDevelopmentProcessApprovalVote_processId_approverPersonId_key";

ALTER TABLE "ClubDevelopmentProcessApprovalVote" ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ClubDevelopmentProcessApprovalVote" ADD COLUMN "legacyRevisionUnscoped" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ClubDevelopmentProcessApprovalVote" SET "legacyRevisionUnscoped" = true;

CREATE UNIQUE INDEX "ClubDevelopmentProcessApprovalVote_processId_approverPersonId_contentRevision_key"
  ON "ClubDevelopmentProcessApprovalVote"("processId", "approverPersonId", "contentRevision");
CREATE INDEX "ClubDevelopmentProcessApprovalVote_tenantId_processId_contentRevision_idx"
  ON "ClubDevelopmentProcessApprovalVote"("tenantId", "processId", "contentRevision");
