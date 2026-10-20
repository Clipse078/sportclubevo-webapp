-- SCE-TOURNAMENT-PLANNER-02D — predefined programme templates (additive)

ALTER TABLE "TournamentFixtureSide"
ADD COLUMN "participantUnitId" TEXT;

ALTER TABLE "TournamentFixtureSide"
ADD CONSTRAINT "TournamentFixtureSide_participantUnitId_fkey"
FOREIGN KEY ("participantUnitId") REFERENCES "TournamentParticipantUnit"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TournamentFixtureSide_participantUnitId_idx"
ON "TournamentFixtureSide"("participantUnitId");

ALTER TABLE "TournamentCompetitionConfiguration"
ADD COLUMN "programmeTemplateId" TEXT,
ADD COLUMN "programmeTemplateVersion" INTEGER,
ADD COLUMN "programmeTemplateSlotMappingJson" JSONB;
