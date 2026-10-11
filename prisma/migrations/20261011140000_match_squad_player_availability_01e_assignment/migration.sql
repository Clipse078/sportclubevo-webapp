-- MATCH_SQUAD_PLAYER_AVAILABILITY-01E — approved release → activity squad assignment provenance

ALTER TABLE "MatchSquadMember"
  ADD COLUMN "playerReleaseRequestId" TEXT,
  ADD COLUMN "assignedByUserId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MatchSquadMember_playerReleaseRequestId_key" ON "MatchSquadMember"("playerReleaseRequestId");

ALTER TABLE "MatchSquadMember" ADD CONSTRAINT "MatchSquadMember_playerReleaseRequestId_fkey" FOREIGN KEY ("playerReleaseRequestId") REFERENCES "PlayerReleaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchSquadMember" ADD CONSTRAINT "MatchSquadMember_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "NotificationType" ADD VALUE 'PLAYER_RELEASE_ASSIGNED';
