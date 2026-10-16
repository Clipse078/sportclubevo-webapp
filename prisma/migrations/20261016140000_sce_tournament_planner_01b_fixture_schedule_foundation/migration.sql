-- SCE-TOURNAMENT-PLANNER-01B: durable tournament fixtures + versioned schedule assignments.

CREATE TYPE "TournamentScheduleVersionStatus" AS ENUM ('WORKING', 'APPROVED', 'SUPERSEDED');

CREATE TABLE "TournamentFixture" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "stageKey" TEXT NOT NULL DEFAULT 'MAIN',
    "roundIndex" INTEGER NOT NULL,
    "slotIndexInRound" INTEGER NOT NULL,
    "generatorKey" TEXT,
    "sideAParticipantId" TEXT NOT NULL,
    "sideBParticipantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentFixture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentScheduleVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "TournamentScheduleVersionStatus" NOT NULL DEFAULT 'WORKING',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "matchDurationMinutes" INTEGER,
    "transitionMinutes" INTEGER,
    "minRestMinutes" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentScheduleVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentFixtureAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleVersionId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "facilityResourceId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "lockedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentFixtureAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentFixture_eventId_stageKey_roundIndex_slotIndexInRound_key" ON "TournamentFixture"("eventId", "stageKey", "roundIndex", "slotIndexInRound");

CREATE INDEX "TournamentFixture_tenantId_idx" ON "TournamentFixture"("tenantId");
CREATE INDEX "TournamentFixture_eventId_idx" ON "TournamentFixture"("eventId");
CREATE INDEX "TournamentFixture_tenantId_eventId_idx" ON "TournamentFixture"("tenantId", "eventId");
CREATE INDEX "TournamentFixture_sideAParticipantId_idx" ON "TournamentFixture"("sideAParticipantId");
CREATE INDEX "TournamentFixture_sideBParticipantId_idx" ON "TournamentFixture"("sideBParticipantId");

CREATE UNIQUE INDEX "TournamentScheduleVersion_eventId_versionNumber_key" ON "TournamentScheduleVersion"("eventId", "versionNumber");

CREATE INDEX "TournamentScheduleVersion_tenantId_idx" ON "TournamentScheduleVersion"("tenantId");
CREATE INDEX "TournamentScheduleVersion_eventId_idx" ON "TournamentScheduleVersion"("eventId");
CREATE INDEX "TournamentScheduleVersion_tenantId_eventId_idx" ON "TournamentScheduleVersion"("tenantId", "eventId");
CREATE INDEX "TournamentScheduleVersion_eventId_status_idx" ON "TournamentScheduleVersion"("eventId", "status");

CREATE UNIQUE INDEX "TournamentFixtureAssignment_scheduleVersionId_fixtureId_key" ON "TournamentFixtureAssignment"("scheduleVersionId", "fixtureId");

CREATE INDEX "TournamentFixtureAssignment_tenantId_idx" ON "TournamentFixtureAssignment"("tenantId");
CREATE INDEX "TournamentFixtureAssignment_scheduleVersionId_idx" ON "TournamentFixtureAssignment"("scheduleVersionId");
CREATE INDEX "TournamentFixtureAssignment_fixtureId_idx" ON "TournamentFixtureAssignment"("fixtureId");
CREATE INDEX "TournamentFixtureAssignment_tenantId_scheduleVersionId_idx" ON "TournamentFixtureAssignment"("tenantId", "scheduleVersionId");
CREATE INDEX "TournamentFixtureAssignment_facilityResourceId_startAt_idx" ON "TournamentFixtureAssignment"("facilityResourceId", "startAt");

ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_sideAParticipantId_fkey" FOREIGN KEY ("sideAParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TournamentFixture" ADD CONSTRAINT "TournamentFixture_sideBParticipantId_fkey" FOREIGN KEY ("sideBParticipantId") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentScheduleVersion" ADD CONSTRAINT "TournamentScheduleVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentScheduleVersion" ADD CONSTRAINT "TournamentScheduleVersion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentFixtureAssignment" ADD CONSTRAINT "TournamentFixtureAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureAssignment" ADD CONSTRAINT "TournamentFixtureAssignment_scheduleVersionId_fkey" FOREIGN KEY ("scheduleVersionId") REFERENCES "TournamentScheduleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureAssignment" ADD CONSTRAINT "TournamentFixtureAssignment_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "TournamentFixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentFixtureAssignment" ADD CONSTRAINT "TournamentFixtureAssignment_facilityResourceId_fkey" FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
