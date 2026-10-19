-- SCE-TOURNAMENT-PLANNER-02C — tournament-local playing units (additive).

CREATE TYPE "TournamentParticipantUnitMode" AS ENUM ('FULL', 'SUBUNIT');

CREATE TABLE "TournamentParticipantUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tournamentParticipantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mode" "TournamentParticipantUnitMode" NOT NULL DEFAULT 'FULL',
    "capacityPartitionKey" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentParticipantUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TournamentParticipantUnit_tenantId_idx" ON "TournamentParticipantUnit"("tenantId");
CREATE INDEX "TournamentParticipantUnit_tournamentParticipantId_idx" ON "TournamentParticipantUnit"("tournamentParticipantId");
CREATE INDEX "TournamentParticipantUnit_tenantId_tournamentParticipantId_idx" ON "TournamentParticipantUnit"("tenantId", "tournamentParticipantId");

ALTER TABLE "TournamentParticipantUnit" ADD CONSTRAINT "TournamentParticipantUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentParticipantUnit" ADD CONSTRAINT "TournamentParticipantUnit_tournamentParticipantId_fkey" FOREIGN KEY ("tournamentParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
