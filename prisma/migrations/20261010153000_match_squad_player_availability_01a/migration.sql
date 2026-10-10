-- MATCH_SQUAD_PLAYER_AVAILABILITY-01A — draft match squad foundation

CREATE TABLE "MatchSquad" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamSeasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSquad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MatchSquadMember" (
    "id" TEXT NOT NULL,
    "matchSquadId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSquadMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_squad_tenant_event_uq" ON "MatchSquad"("tenantId", "eventId");
CREATE INDEX "match_squad_tenant_team_season_idx" ON "MatchSquad"("tenantId", "teamSeasonId");
CREATE INDEX "match_squad_event_idx" ON "MatchSquad"("eventId");

CREATE UNIQUE INDEX "match_squad_member_person_uq" ON "MatchSquadMember"("matchSquadId", "personId");
CREATE INDEX "match_squad_member_person_idx" ON "MatchSquadMember"("personId");

ALTER TABLE "MatchSquad" ADD CONSTRAINT "MatchSquad_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchSquad" ADD CONSTRAINT "MatchSquad_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchSquad" ADD CONSTRAINT "MatchSquad_teamSeasonId_fkey"
    FOREIGN KEY ("teamSeasonId") REFERENCES "TeamSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MatchSquadMember" ADD CONSTRAINT "MatchSquadMember_matchSquadId_fkey"
    FOREIGN KEY ("matchSquadId") REFERENCES "MatchSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchSquadMember" ADD CONSTRAINT "MatchSquadMember_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
