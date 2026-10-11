-- MATCH_SQUAD_PLAYER_AVAILABILITY-01D — cross-team PlayerReleaseRequest aggregate

CREATE TYPE "PlayerReleaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "PlayerReleaseRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "playerReleaseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sourceTeamSeasonId" TEXT NOT NULL,
    "targetTeamSeasonId" TEXT NOT NULL,
    "targetEventId" TEXT NOT NULL,
    "requestedMinutes" INTEGER,
    "requestNote" TEXT,
    "status" "PlayerReleaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "releaseMaxMinutesSnapshot" INTEGER,
    "releaseReasonSnapshot" "PlayerReleaseReason",
    "requestedByUserId" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "cancelledByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerReleaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "player_release_request_target_event_status_idx" ON "PlayerReleaseRequest"("tenantId", "targetTeamSeasonId", "targetEventId", "status");
CREATE INDEX "player_release_request_source_status_idx" ON "PlayerReleaseRequest"("tenantId", "sourceTeamSeasonId", "status");
CREATE INDEX "player_release_request_release_event_idx" ON "PlayerReleaseRequest"("tenantId", "playerReleaseId", "targetEventId");
CREATE INDEX "player_release_request_person_event_idx" ON "PlayerReleaseRequest"("tenantId", "personId", "targetEventId");

ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_playerReleaseId_fkey" FOREIGN KEY ("playerReleaseId") REFERENCES "PlayerRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_sourceTeamSeasonId_fkey" FOREIGN KEY ("sourceTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_targetTeamSeasonId_fkey" FOREIGN KEY ("targetTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_targetEventId_fkey" FOREIGN KEY ("targetEventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerReleaseRequest" ADD CONSTRAINT "PlayerReleaseRequest_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
