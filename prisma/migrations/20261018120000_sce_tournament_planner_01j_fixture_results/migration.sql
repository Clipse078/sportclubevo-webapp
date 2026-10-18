-- SCE-TOURNAMENT-PLANNER-01J — additive fixture result persistence

CREATE TYPE "TournamentFixtureResultState" AS ENUM ('UNPLAYED', 'COMPLETED');

CREATE TABLE "TournamentFixtureResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "state" "TournamentFixtureResultState" NOT NULL DEFAULT 'UNPLAYED',
    "scoreSideA" INTEGER,
    "scoreSideB" INTEGER,
    "winnerParticipantId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "lastModifiedByUserId" TEXT,
    "previousResultSnapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentFixtureResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentFixtureResult_fixtureId_key" ON "TournamentFixtureResult"("fixtureId");

CREATE INDEX "TournamentFixtureResult_tenantId_idx" ON "TournamentFixtureResult"("tenantId");
CREATE INDEX "TournamentFixtureResult_tenantId_fixtureId_idx" ON "TournamentFixtureResult"("tenantId", "fixtureId");

ALTER TABLE "TournamentFixtureResult" ADD CONSTRAINT "TournamentFixtureResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureResult" ADD CONSTRAINT "TournamentFixtureResult_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "TournamentFixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureResult" ADD CONSTRAINT "TournamentFixtureResult_winnerParticipantId_fkey" FOREIGN KEY ("winnerParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
