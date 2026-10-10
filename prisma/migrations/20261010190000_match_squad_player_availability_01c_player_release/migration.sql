-- MATCH_SQUAD_PLAYER_AVAILABILITY-01C — Spielerfreigabe foundation

CREATE TYPE "PlayerReleaseStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TYPE "PlayerReleaseReason" AS ENUM (
    'SPIELPRAXIS',
    'ENTWICKLUNG',
    'KADERAUSGLEICH',
    'TORHUETER_UNTERSTUETZUNG',
    'COMEBACK_BELASTUNGSAUFBAU',
    'ANDERE'
);

CREATE TABLE "PlayerRelease" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sourceTeamSeasonId" TEXT NOT NULL,
    "targetTeamSeasonId" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "maxMinutes" INTEGER,
    "reason" "PlayerReleaseReason" NOT NULL,
    "note" TEXT,
    "status" "PlayerReleaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerRelease_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "player_release_source_status_idx" ON "PlayerRelease"("tenantId", "sourceTeamSeasonId", "status");
CREATE INDEX "player_release_target_status_idx" ON "PlayerRelease"("tenantId", "targetTeamSeasonId", "status");
CREATE INDEX "player_release_person_source_idx" ON "PlayerRelease"("tenantId", "personId", "sourceTeamSeasonId");
CREATE INDEX "player_release_target_validity_idx" ON "PlayerRelease"("tenantId", "targetTeamSeasonId", "validFrom", "validUntil");

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_sourceTeamSeasonId_fkey"
    FOREIGN KEY ("sourceTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_targetTeamSeasonId_fkey"
    FOREIGN KEY ("targetTeamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_revokedByUserId_fkey"
    FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerRelease" ADD CONSTRAINT "PlayerRelease_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
