-- SCE-CD-04R2 — sprint lifecycle timestamps, goal result, close snapshot, start commitment flag (additive).

CREATE TYPE "DevelopmentSprintGoalResult" AS ENUM ('ACHIEVED', 'PARTLY_ACHIEVED', 'NOT_ACHIEVED');

ALTER TABLE "DevelopmentSprint" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "DevelopmentSprint" ADD COLUMN "goalResult" "DevelopmentSprintGoalResult";
ALTER TABLE "DevelopmentSprint" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "DevelopmentSprint" ADD COLUMN "closeSnapshot" JSONB;

ALTER TABLE "DevelopmentSprintTaskMembership" ADD COLUMN "committedAtSprintStart" BOOLEAN NOT NULL DEFAULT false;