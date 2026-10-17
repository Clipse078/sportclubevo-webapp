-- SCE-TOURNAMENT-PLANNER-01G — schedule lock dimension on fixture assignments (non-destructive).

CREATE TYPE "TournamentFixtureScheduleLockDimension" AS ENUM ('TIME', 'PITCH', 'TIME_AND_PITCH');

ALTER TABLE "TournamentFixtureAssignment"
ADD COLUMN "scheduleLockDimension" "TournamentFixtureScheduleLockDimension";

UPDATE "TournamentFixtureAssignment"
SET "scheduleLockDimension" = 'TIME_AND_PITCH'
WHERE "isLocked" = true;
