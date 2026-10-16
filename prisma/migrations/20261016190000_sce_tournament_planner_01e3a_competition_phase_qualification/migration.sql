-- SCE-TOURNAMENT-PLANNER-01E3A — competition format, phases, groups, fixture sides, qualification sources.

CREATE TYPE "TournamentCompetitionFormat" AS ENUM ('GROUP_MIX_ONLY', 'KNOCKOUT_ONLY', 'GROUP_PLUS_KNOCKOUT');
CREATE TYPE "TournamentPhaseType" AS ENUM ('GROUP_MIX', 'KNOCKOUT');
CREATE TYPE "TournamentGroupMixGenerationStrategy" AS ENUM ('ROUND_ROBIN', 'SMART_MIX');
CREATE TYPE "TournamentFixtureSideLabel" AS ENUM ('A', 'B');
CREATE TYPE "TournamentFixtureSideSourceType" AS ENUM ('CONCRETE_PARTICIPANT', 'QUALIFICATION_REFERENCE');
CREATE TYPE "TournamentQualificationSourceType" AS ENUM ('GROUP_RANK', 'WINNER_OF_FIXTURE', 'LOSER_OF_FIXTURE');
CREATE TYPE "TournamentRankingTiebreakCriterion" AS ENUM ('POINTS', 'GOAL_DIFFERENCE', 'GOALS_SCORED', 'HEAD_TO_HEAD');

CREATE TABLE "TournamentCompetitionConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "competitionFormat" "TournamentCompetitionFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentCompetitionConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentPhase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "phaseType" "TournamentPhaseType" NOT NULL,
    "label" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL,
    "groupMixStrategy" "TournamentGroupMixGenerationStrategy",
    "smartMixTargetMatchesPerParticipant" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentPhase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tournamentPhaseId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentGroupMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tournamentGroupId" TEXT NOT NULL,
    "tournamentParticipantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentGroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentRankingConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "winPoints" INTEGER NOT NULL DEFAULT 3,
    "drawPoints" INTEGER NOT NULL DEFAULT 1,
    "lossPoints" INTEGER NOT NULL DEFAULT 0,
    "tiebreakOrder" "TournamentRankingTiebreakCriterion"[] DEFAULT ARRAY['POINTS', 'GOAL_DIFFERENCE', 'GOALS_SCORED', 'HEAD_TO_HEAD']::"TournamentRankingTiebreakCriterion"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentRankingConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentQualificationSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sourceType" "TournamentQualificationSourceType" NOT NULL,
    "sourceGroupId" TEXT,
    "rank" INTEGER,
    "sourceFixtureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentQualificationSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentFixtureSide" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "side" "TournamentFixtureSideLabel" NOT NULL,
    "sourceType" "TournamentFixtureSideSourceType" NOT NULL,
    "participantId" TEXT,
    "qualificationSourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TournamentFixtureSide_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TournamentFixture" ADD COLUMN "tournamentPhaseId" TEXT;
ALTER TABLE "TournamentFixture" ALTER COLUMN "sideAParticipantId" DROP NOT NULL;
ALTER TABLE "TournamentFixture" ALTER COLUMN "sideBParticipantId" DROP NOT NULL;

CREATE UNIQUE INDEX "TournamentCompetitionConfiguration_eventId_key" ON "TournamentCompetitionConfiguration"("eventId");
CREATE INDEX "TournamentCompetitionConfiguration_tenantId_idx" ON "TournamentCompetitionConfiguration"("tenantId");
CREATE INDEX "TournamentCompetitionConfiguration_tenantId_eventId_idx" ON "TournamentCompetitionConfiguration"("tenantId", "eventId");

CREATE UNIQUE INDEX "TournamentPhase_eventId_displayOrder_key" ON "TournamentPhase"("eventId", "displayOrder");
CREATE UNIQUE INDEX "TournamentPhase_eventId_stageKey_key" ON "TournamentPhase"("eventId", "stageKey");
CREATE INDEX "TournamentPhase_tenantId_idx" ON "TournamentPhase"("tenantId");
CREATE INDEX "TournamentPhase_eventId_idx" ON "TournamentPhase"("eventId");
CREATE INDEX "TournamentPhase_tenantId_eventId_idx" ON "TournamentPhase"("tenantId", "eventId");

CREATE UNIQUE INDEX "TournamentGroup_tournamentPhaseId_displayOrder_key" ON "TournamentGroup"("tournamentPhaseId", "displayOrder");
CREATE UNIQUE INDEX "TournamentGroup_tournamentPhaseId_label_key" ON "TournamentGroup"("tournamentPhaseId", "label");
CREATE INDEX "TournamentGroup_tenantId_idx" ON "TournamentGroup"("tenantId");
CREATE INDEX "TournamentGroup_eventId_idx" ON "TournamentGroup"("eventId");
CREATE INDEX "TournamentGroup_tournamentPhaseId_idx" ON "TournamentGroup"("tournamentPhaseId");
CREATE INDEX "TournamentGroup_tenantId_eventId_idx" ON "TournamentGroup"("tenantId", "eventId");

CREATE UNIQUE INDEX "TournamentGroupMembership_tournamentGroupId_tournamentParticip_key" ON "TournamentGroupMembership"("tournamentGroupId", "tournamentParticipantId");
CREATE INDEX "TournamentGroupMembership_tenantId_idx" ON "TournamentGroupMembership"("tenantId");
CREATE INDEX "TournamentGroupMembership_eventId_idx" ON "TournamentGroupMembership"("eventId");
CREATE INDEX "TournamentGroupMembership_tournamentParticipantId_idx" ON "TournamentGroupMembership"("tournamentParticipantId");
CREATE INDEX "TournamentGroupMembership_tenantId_eventId_idx" ON "TournamentGroupMembership"("tenantId", "eventId");

CREATE UNIQUE INDEX "TournamentRankingConfiguration_eventId_key" ON "TournamentRankingConfiguration"("eventId");
CREATE INDEX "TournamentRankingConfiguration_tenantId_idx" ON "TournamentRankingConfiguration"("tenantId");

CREATE INDEX "TournamentQualificationSource_tenantId_idx" ON "TournamentQualificationSource"("tenantId");
CREATE INDEX "TournamentQualificationSource_eventId_idx" ON "TournamentQualificationSource"("eventId");
CREATE INDEX "TournamentQualificationSource_sourceGroupId_idx" ON "TournamentQualificationSource"("sourceGroupId");
CREATE INDEX "TournamentQualificationSource_sourceFixtureId_idx" ON "TournamentQualificationSource"("sourceFixtureId");

CREATE UNIQUE INDEX "TournamentFixtureSide_fixtureId_side_key" ON "TournamentFixtureSide"("fixtureId", "side");
CREATE INDEX "TournamentFixtureSide_tenantId_idx" ON "TournamentFixtureSide"("tenantId");
CREATE INDEX "TournamentFixtureSide_fixtureId_idx" ON "TournamentFixtureSide"("fixtureId");
CREATE INDEX "TournamentFixtureSide_participantId_idx" ON "TournamentFixtureSide"("participantId");
CREATE INDEX "TournamentFixtureSide_qualificationSourceId_idx" ON "TournamentFixtureSide"("qualificationSourceId");

CREATE INDEX "TournamentFixture_tournamentPhaseId_idx" ON "TournamentFixture"("tournamentPhaseId");

ALTER TABLE "TournamentCompetitionConfiguration" ADD CONSTRAINT "TournamentCompetitionConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentCompetitionConfiguration" ADD CONSTRAINT "TournamentCompetitionConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentPhase" ADD CONSTRAINT "TournamentPhase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentPhase" ADD CONSTRAINT "TournamentPhase_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tournamentPhaseId_fkey" FOREIGN KEY ("tournamentPhaseId") REFERENCES "TournamentPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentGroupMembership" ADD CONSTRAINT "TournamentGroupMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentGroupMembership" ADD CONSTRAINT "TournamentGroupMembership_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentGroupMembership" ADD CONSTRAINT "TournamentGroupMembership_tournamentGroupId_fkey" FOREIGN KEY ("tournamentGroupId") REFERENCES "TournamentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentGroupMembership" ADD CONSTRAINT "TournamentGroupMembership_tournamentParticipantId_fkey" FOREIGN KEY ("tournamentParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentRankingConfiguration" ADD CONSTRAINT "TournamentRankingConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentRankingConfiguration" ADD CONSTRAINT "TournamentRankingConfiguration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentQualificationSource" ADD CONSTRAINT "TournamentQualificationSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentQualificationSource" ADD CONSTRAINT "TournamentQualificationSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentQualificationSource" ADD CONSTRAINT "TournamentQualificationSource_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "TournamentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentQualificationSource" ADD CONSTRAINT "TournamentQualificationSource_sourceFixtureId_fkey" FOREIGN KEY ("sourceFixtureId") REFERENCES "TournamentFixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentFixtureSide" ADD CONSTRAINT "TournamentFixtureSide_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureSide" ADD CONSTRAINT "TournamentFixtureSide_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "TournamentFixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureSide" ADD CONSTRAINT "TournamentFixtureSide_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureSide" ADD CONSTRAINT "TournamentFixtureSide_qualificationSourceId_fkey" FOREIGN KEY ("qualificationSourceId") REFERENCES "TournamentQualificationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_tournamentPhaseId_fkey" FOREIGN KEY ("tournamentPhaseId") REFERENCES "TournamentPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill durable concrete fixture sides from legacy participant columns (no fixture rows removed).
INSERT INTO "TournamentFixtureSide" ("id", "tenantId", "fixtureId", "side", "sourceType", "participantId", "qualificationSourceId", "createdAt", "updatedAt")
SELECT
    'tfs_a_' || f."id",
    f."tenantId",
    f."id",
    'A'::"TournamentFixtureSideLabel",
    'CONCRETE_PARTICIPANT'::"TournamentFixtureSideSourceType",
    f."sideAParticipantId",
    NULL,
    f."createdAt",
    f."updatedAt"
FROM "TournamentFixture" f
WHERE f."sideAParticipantId" IS NOT NULL;

INSERT INTO "TournamentFixtureSide" ("id", "tenantId", "fixtureId", "side", "sourceType", "participantId", "qualificationSourceId", "createdAt", "updatedAt")
SELECT
    'tfs_b_' || f."id",
    f."tenantId",
    f."id",
    'B'::"TournamentFixtureSideLabel",
    'CONCRETE_PARTICIPANT'::"TournamentFixtureSideSourceType",
    f."sideBParticipantId",
    NULL,
    f."createdAt",
    f."updatedAt"
FROM "TournamentFixture" f
WHERE f."sideBParticipantId" IS NOT NULL;
