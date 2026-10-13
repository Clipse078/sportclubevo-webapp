-- SCE-CLUB-EVENT-AUDIENCE-01-R1 — recurring club event series + create workflow foundation

CREATE TYPE "ClubEventRecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY');
CREATE TYPE "ClubEventMonthlyPatternKind" AS ENUM ('DAY_OF_MONTH', 'ORDINAL_WEEKDAY');
CREATE TYPE "ClubEventMonthOrdinal" AS ENUM ('FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST');
CREATE TYPE "ClubEventRecurrenceEndMode" AS ENUM ('ON_DATE', 'AFTER_COUNT');
CREATE TYPE "ClubEventSeriesStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ClubEventSeriesOccurrenceExceptionKind" AS ENUM ('CANCELLED');

CREATE TABLE "ClubEventSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seasonId" TEXT,
    "status" "ClubEventSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "organizerName" TEXT,
    "remarks" TEXT,
    "frequency" "ClubEventRecurrenceFrequency" NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "weekday" "Weekday",
    "monthlyPatternKind" "ClubEventMonthlyPatternKind",
    "monthDay" INTEGER,
    "monthOrdinal" "ClubEventMonthOrdinal",
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startsAtTime" TEXT,
    "endsAtTime" TEXT,
    "timezone" TEXT NOT NULL,
    "seriesStartDateKey" TEXT NOT NULL,
    "endMode" "ClubEventRecurrenceEndMode" NOT NULL,
    "endDateKey" TEXT,
    "occurrenceCountLimit" INTEGER,
    "websiteVisible" BOOLEAN NOT NULL DEFAULT true,
    "infoboardVisible" BOOLEAN NOT NULL DEFAULT false,
    "homepageVisible" BOOLEAN NOT NULL DEFAULT false,
    "wochenplanVisible" BOOLEAN NOT NULL DEFAULT false,
    "trainingsplanVisible" BOOLEAN NOT NULL DEFAULT false,
    "teamPageVisible" BOOLEAN NOT NULL DEFAULT false,
    "clubEventOrganisationalScope" "ClubEventOrganisationalScope" NOT NULL DEFAULT 'CLUB_WIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEventSeries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubEventSeriesOrganisationalAudienceTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEventSeriesOrganisationalAudienceTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubEventSeriesOrganisationalAudienceOrgUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEventSeriesOrganisationalAudienceOrgUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubEventSeriesOccurrenceException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "occurrenceDateKey" TEXT NOT NULL,
    "kind" "ClubEventSeriesOccurrenceExceptionKind" NOT NULL,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEventSeriesOccurrenceException_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event" ADD COLUMN "clubEventSeriesId" TEXT;
ALTER TABLE "Event" ADD COLUMN "clubEventOccurrenceDateKey" TEXT;

CREATE UNIQUE INDEX "Event_clubEventSeriesId_clubEventOccurrenceDateKey_key" ON "Event"("clubEventSeriesId", "clubEventOccurrenceDateKey");
CREATE INDEX "Event_clubEventSeriesId_idx" ON "Event"("clubEventSeriesId");

CREATE INDEX "ClubEventSeries_tenantId_idx" ON "ClubEventSeries"("tenantId");
CREATE INDEX "ClubEventSeries_tenantId_status_idx" ON "ClubEventSeries"("tenantId", "status");
CREATE INDEX "ClubEventSeries_seasonId_idx" ON "ClubEventSeries"("seasonId");

CREATE UNIQUE INDEX "ClubEventSeriesOrganisationalAudienceTeam_seriesId_teamId_key" ON "ClubEventSeriesOrganisationalAudienceTeam"("seriesId", "teamId");
CREATE INDEX "ClubEventSeriesOrganisationalAudienceTeam_tenantId_idx" ON "ClubEventSeriesOrganisationalAudienceTeam"("tenantId");
CREATE INDEX "ClubEventSeriesOrganisationalAudienceTeam_tenantId_seriesId_idx" ON "ClubEventSeriesOrganisationalAudienceTeam"("tenantId", "seriesId");

CREATE UNIQUE INDEX "ClubEventSeriesOrganisationalAudienceOrgUnit_seriesId_orgUnitId_key" ON "ClubEventSeriesOrganisationalAudienceOrgUnit"("seriesId", "orgUnitId");
CREATE INDEX "ClubEventSeriesOrganisationalAudienceOrgUnit_tenantId_idx" ON "ClubEventSeriesOrganisationalAudienceOrgUnit"("tenantId");
CREATE INDEX "ClubEventSeriesOrganisationalAudienceOrgUnit_tenantId_seriesId_idx" ON "ClubEventSeriesOrganisationalAudienceOrgUnit"("tenantId", "seriesId");

CREATE UNIQUE INDEX "ClubEventSeriesOccurrenceException_seriesId_occurrenceDateKey_key" ON "ClubEventSeriesOccurrenceException"("seriesId", "occurrenceDateKey");
CREATE UNIQUE INDEX "ClubEventSeriesOccurrenceException_eventId_key" ON "ClubEventSeriesOccurrenceException"("eventId");
CREATE INDEX "ClubEventSeriesOccurrenceException_tenantId_idx" ON "ClubEventSeriesOccurrenceException"("tenantId");
CREATE INDEX "ClubEventSeriesOccurrenceException_tenantId_seriesId_idx" ON "ClubEventSeriesOccurrenceException"("tenantId", "seriesId");

ALTER TABLE "ClubEventSeries" ADD CONSTRAINT "ClubEventSeries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeries" ADD CONSTRAINT "ClubEventSeries_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClubEventSeriesOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceTeam_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClubEventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubEventSeriesOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceOrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceOrgUnit_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClubEventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventSeriesOrganisationalAudienceOrgUnit_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubEventSeriesOccurrenceException" ADD CONSTRAINT "ClubEventSeriesOccurrenceException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOccurrenceException" ADD CONSTRAINT "ClubEventSeriesOccurrenceException_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClubEventSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventSeriesOccurrenceException" ADD CONSTRAINT "ClubEventSeriesOccurrenceException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_clubEventSeriesId_fkey" FOREIGN KEY ("clubEventSeriesId") REFERENCES "ClubEventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
