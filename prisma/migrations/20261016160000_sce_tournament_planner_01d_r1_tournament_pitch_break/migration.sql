-- SCE-TOURNAMENT-PLANNER-01D-R1 — TournamentPitch + TournamentBreak; assignments → TournamentPitch
-- Non-destructive: no operational TournamentFixtureAssignment rows expected pre user-facing scheduling.

CREATE TYPE "TournamentBreakScope" AS ENUM ('ALL_PITCHES', 'SELECTED_PITCHES');

CREATE TABLE "TournamentPitch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPitch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentBreak" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "label" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "scope" "TournamentBreakScope" NOT NULL DEFAULT 'ALL_PITCHES',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentBreak_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentBreakPitch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tournamentBreakId" TEXT NOT NULL,
    "tournamentPitchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentBreakPitch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentPitch_eventId_displayOrder_key" ON "TournamentPitch"("eventId", "displayOrder");
CREATE UNIQUE INDEX "TournamentPitch_eventId_label_key" ON "TournamentPitch"("eventId", "label");
CREATE INDEX "TournamentPitch_tenantId_idx" ON "TournamentPitch"("tenantId");
CREATE INDEX "TournamentPitch_eventId_idx" ON "TournamentPitch"("eventId");
CREATE INDEX "TournamentPitch_tenantId_eventId_idx" ON "TournamentPitch"("tenantId", "eventId");

CREATE INDEX "TournamentBreak_tenantId_idx" ON "TournamentBreak"("tenantId");
CREATE INDEX "TournamentBreak_eventId_idx" ON "TournamentBreak"("eventId");
CREATE INDEX "TournamentBreak_tenantId_eventId_idx" ON "TournamentBreak"("tenantId", "eventId");
CREATE INDEX "TournamentBreak_eventId_startAt_idx" ON "TournamentBreak"("eventId", "startAt");

CREATE UNIQUE INDEX "TournamentBreakPitch_tournamentBreakId_tournamentPitchId_key" ON "TournamentBreakPitch"("tournamentBreakId", "tournamentPitchId");
CREATE INDEX "TournamentBreakPitch_tenantId_idx" ON "TournamentBreakPitch"("tenantId");
CREATE INDEX "TournamentBreakPitch_tournamentPitchId_idx" ON "TournamentBreakPitch"("tournamentPitchId");

ALTER TABLE "TournamentPitch" ADD CONSTRAINT "TournamentPitch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentPitch" ADD CONSTRAINT "TournamentPitch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentBreak" ADD CONSTRAINT "TournamentBreak_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentBreak" ADD CONSTRAINT "TournamentBreak_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentBreakPitch" ADD CONSTRAINT "TournamentBreakPitch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentBreakPitch" ADD CONSTRAINT "TournamentBreakPitch_tournamentBreakId_fkey" FOREIGN KEY ("tournamentBreakId") REFERENCES "TournamentBreak"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentBreakPitch" ADD CONSTRAINT "TournamentBreakPitch_tournamentPitchId_fkey" FOREIGN KEY ("tournamentPitchId") REFERENCES "TournamentPitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentFixtureAssignment" DROP CONSTRAINT "TournamentFixtureAssignment_facilityResourceId_fkey";
DROP INDEX "TournamentFixtureAssignment_facilityResourceId_startAt_idx";
ALTER TABLE "TournamentFixtureAssignment" DROP COLUMN "facilityResourceId";
ALTER TABLE "TournamentFixtureAssignment" ADD COLUMN "tournamentPitchId" TEXT NOT NULL;

CREATE INDEX "TournamentFixtureAssignment_tournamentPitchId_startAt_idx" ON "TournamentFixtureAssignment"("tournamentPitchId", "startAt");
ALTER TABLE "TournamentFixtureAssignment" ADD CONSTRAINT "TournamentFixtureAssignment_tournamentPitchId_fkey" FOREIGN KEY ("tournamentPitchId") REFERENCES "TournamentPitch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
