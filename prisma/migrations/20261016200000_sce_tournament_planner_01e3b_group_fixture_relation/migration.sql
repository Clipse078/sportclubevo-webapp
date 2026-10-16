-- SCE-TOURNAMENT-PLANNER-01E3B — durable TournamentFixture → TournamentGroup relation
-- Allows per-group structural round indices under the same phase stageKey.

ALTER TABLE "TournamentFixture" ADD COLUMN "tournamentGroupId" TEXT;

CREATE INDEX "TournamentFixture_tournamentGroupId_idx" ON "TournamentFixture"("tournamentGroupId");

ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_tournamentGroupId_fkey"
  FOREIGN KEY ("tournamentGroupId") REFERENCES "TournamentGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "TournamentFixture_eventId_stageKey_roundIndex_slotIndexInRound_key";

CREATE UNIQUE INDEX "TournamentFixture_legacy_slot_unique"
  ON "TournamentFixture"("eventId", "stageKey", "roundIndex", "slotIndexInRound")
  WHERE "tournamentGroupId" IS NULL;

CREATE UNIQUE INDEX "TournamentFixture_group_slot_unique"
  ON "TournamentFixture"("eventId", "tournamentGroupId", "roundIndex", "slotIndexInRound")
  WHERE "tournamentGroupId" IS NOT NULL;
