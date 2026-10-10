-- MATCH_SQUAD_PLAYER_AVAILABILITY-01C-R2 — activity-scoped Spielerfreigabe

CREATE TYPE "PlayerReleaseScope" AS ENUM ('PERIOD', 'ACTIVITY');

ALTER TABLE "PlayerRelease"
  ADD COLUMN "scope" "PlayerReleaseScope" NOT NULL DEFAULT 'PERIOD',
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "trainingSessionId" TEXT;

CREATE INDEX "player_release_event_idx" ON "PlayerRelease"("tenantId", "eventId");
CREATE INDEX "player_release_training_session_idx" ON "PlayerRelease"("tenantId", "trainingSessionId");

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_trainingSessionId_fkey"
  FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
