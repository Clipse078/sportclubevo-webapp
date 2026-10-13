-- SCE-CLUB-EVENT-AUDIENCE-01 — Club event organisational scope

CREATE TYPE "ClubEventOrganisationalScope" AS ENUM ('CLUB_WIDE', 'SELECTED_ORG_UNITS');

ALTER TABLE "Event"
ADD COLUMN "clubEventOrganisationalScope" "ClubEventOrganisationalScope" NOT NULL DEFAULT 'CLUB_WIDE';

CREATE TABLE "ClubEventOrganisationalAudienceTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEventOrganisationalAudienceTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubEventOrganisationalAudienceOrgUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEventOrganisationalAudienceOrgUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubEventOrganisationalAudienceTeam_eventId_teamId_key" ON "ClubEventOrganisationalAudienceTeam"("eventId", "teamId");
CREATE INDEX "ClubEventOrganisationalAudienceTeam_tenantId_idx" ON "ClubEventOrganisationalAudienceTeam"("tenantId");
CREATE INDEX "ClubEventOrganisationalAudienceTeam_tenantId_eventId_idx" ON "ClubEventOrganisationalAudienceTeam"("tenantId", "eventId");
CREATE INDEX "ClubEventOrganisationalAudienceTeam_tenantId_teamId_idx" ON "ClubEventOrganisationalAudienceTeam"("tenantId", "teamId");

CREATE UNIQUE INDEX "ClubEventOrganisationalAudienceOrgUnit_eventId_orgUnitId_key" ON "ClubEventOrganisationalAudienceOrgUnit"("eventId", "orgUnitId");
CREATE INDEX "ClubEventOrganisationalAudienceOrgUnit_tenantId_idx" ON "ClubEventOrganisationalAudienceOrgUnit"("tenantId");
CREATE INDEX "ClubEventOrganisationalAudienceOrgUnit_tenantId_eventId_idx" ON "ClubEventOrganisationalAudienceOrgUnit"("tenantId", "eventId");
CREATE INDEX "ClubEventOrganisationalAudienceOrgUnit_tenantId_orgUnitId_idx" ON "ClubEventOrganisationalAudienceOrgUnit"("tenantId", "orgUnitId");

ALTER TABLE "ClubEventOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventOrganisationalAudienceTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventOrganisationalAudienceTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventOrganisationalAudienceTeam" ADD CONSTRAINT "ClubEventOrganisationalAudienceTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClubEventOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventOrganisationalAudienceOrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventOrganisationalAudienceOrgUnit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEventOrganisationalAudienceOrgUnit" ADD CONSTRAINT "ClubEventOrganisationalAudienceOrgUnit_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Legacy backfill: type=OTHER events with same-tenant teamId → SELECTED_ORG_UNITS + team target.
INSERT INTO "ClubEventOrganisationalAudienceTeam" ("id", "tenantId", "eventId", "teamId", "createdAt")
SELECT
  gen_random_uuid()::text,
  e."tenantId",
  e."id",
  e."teamId",
  CURRENT_TIMESTAMP
FROM "Event" e
INNER JOIN "Team" t ON t."id" = e."teamId"
WHERE e."type" = 'OTHER'
  AND e."teamId" IS NOT NULL
  AND e."tenantId" IS NOT NULL
  AND t."tenantId" = e."tenantId"
  AND NOT EXISTS (
    SELECT 1 FROM "ClubEventOrganisationalAudienceTeam" existing
    WHERE existing."eventId" = e."id" AND existing."teamId" = e."teamId"
  );

UPDATE "Event" e
SET "clubEventOrganisationalScope" = 'SELECTED_ORG_UNITS'
WHERE e."type" = 'OTHER'
  AND EXISTS (
    SELECT 1 FROM "ClubEventOrganisationalAudienceTeam" t WHERE t."eventId" = e."id"
  )
  OR EXISTS (
    SELECT 1 FROM "ClubEventOrganisationalAudienceOrgUnit" o WHERE o."eventId" = e."id"
  );
