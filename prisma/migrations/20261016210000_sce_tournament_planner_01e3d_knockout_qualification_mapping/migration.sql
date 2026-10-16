-- SCE-TOURNAMENT-PLANNER-01E3D — durable group-rank → knockout entry structural mapping

CREATE TABLE "TournamentKnockoutQualificationMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "knockoutPhaseId" TEXT NOT NULL,
    "sourceGroupId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "slotIndexInRound" INTEGER NOT NULL,
    "side" "TournamentFixtureSideLabel" NOT NULL,
    "qualificationSourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentKnockoutQualificationMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentKnockoutQualificationMapping_qualificationSourceId_key" ON "TournamentKnockoutQualificationMapping"("qualificationSourceId");

CREATE UNIQUE INDEX "TournamentKnockoutQualificationMapping_knockoutPhaseId_roundIndex_slotIndexInRound_side_key" ON "TournamentKnockoutQualificationMapping"("knockoutPhaseId", "roundIndex", "slotIndexInRound", "side");

CREATE UNIQUE INDEX "TournamentKnockoutQualificationMapping_eventId_knockoutPhaseId_sourceGroupId_rank_key" ON "TournamentKnockoutQualificationMapping"("eventId", "knockoutPhaseId", "sourceGroupId", "rank");

CREATE INDEX "TournamentKnockoutQualificationMapping_tenantId_idx" ON "TournamentKnockoutQualificationMapping"("tenantId");

CREATE INDEX "TournamentKnockoutQualificationMapping_eventId_idx" ON "TournamentKnockoutQualificationMapping"("eventId");

CREATE INDEX "TournamentKnockoutQualificationMapping_knockoutPhaseId_idx" ON "TournamentKnockoutQualificationMapping"("knockoutPhaseId");

CREATE INDEX "TournamentKnockoutQualificationMapping_sourceGroupId_idx" ON "TournamentKnockoutQualificationMapping"("sourceGroupId");

CREATE UNIQUE INDEX "TournamentQualificationSource_group_rank_unique" ON "TournamentQualificationSource"("eventId", "sourceGroupId", "rank") WHERE "sourceType" = 'GROUP_RANK' AND "sourceGroupId" IS NOT NULL;

ALTER TABLE "TournamentKnockoutQualificationMapping" ADD CONSTRAINT "TournamentKnockoutQualificationMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentKnockoutQualificationMapping" ADD CONSTRAINT "TournamentKnockoutQualificationMapping_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentKnockoutQualificationMapping" ADD CONSTRAINT "TournamentKnockoutQualificationMapping_knockoutPhaseId_fkey" FOREIGN KEY ("knockoutPhaseId") REFERENCES "TournamentPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentKnockoutQualificationMapping" ADD CONSTRAINT "TournamentKnockoutQualificationMapping_sourceGroupId_fkey" FOREIGN KEY ("sourceGroupId") REFERENCES "TournamentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentKnockoutQualificationMapping" ADD CONSTRAINT "TournamentKnockoutQualificationMapping_qualificationSourceId_fkey" FOREIGN KEY ("qualificationSourceId") REFERENCES "TournamentQualificationSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
