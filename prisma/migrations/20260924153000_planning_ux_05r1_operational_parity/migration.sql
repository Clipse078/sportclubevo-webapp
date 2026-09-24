-- PLANNING-UX-05R1 — operational event workspace parity (forward-only, not applied to STAGE).

-- CreateEnum
CREATE TYPE "PlanningResourceType" AS ENUM ('TRAINING', 'MATCH', 'TOURNAMENT', 'CLUB_EVENT');
CREATE TYPE "EventParticipationAudienceKind" AS ENUM ('PERSON', 'TEAM', 'ORG_UNIT', 'ROLE');

-- AlterEnum CommunicationTargetType
ALTER TYPE "CommunicationTargetType" ADD VALUE 'CLUB_EVENT';

-- AlterEnum AttendanceEventKind
ALTER TYPE "AttendanceEventKind" ADD VALUE 'CLUB_EVENT';

-- AlterTable ParticipationResponse — optional teamSeason for club events
ALTER TABLE "ParticipationResponse" ALTER COLUMN "teamSeasonId" DROP NOT NULL;

-- CreateTable RequirementPlanningResourceReference
CREATE TABLE "RequirementPlanningResourceReference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "resourceType" "PlanningResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementPlanningResourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable EventParticipationAudienceEntry
CREATE TABLE "EventParticipationAudienceEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "EventParticipationAudienceKind" NOT NULL,
    "personId" TEXT,
    "teamId" TEXT,
    "orgUnitId" TEXT,
    "roleId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventParticipationAudienceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequirementPlanningResourceReference_requirementId_resourceType_resourceId_key" ON "RequirementPlanningResourceReference"("requirementId", "resourceType", "resourceId");
CREATE INDEX "RequirementPlanningResourceReference_tenantId_idx" ON "RequirementPlanningResourceReference"("tenantId");
CREATE INDEX "RequirementPlanningResourceReference_tenantId_requirementId_idx" ON "RequirementPlanningResourceReference"("tenantId", "requirementId");
CREATE INDEX "RequirementPlanningResourceReference_tenantId_resourceType_resourceId_idx" ON "RequirementPlanningResourceReference"("tenantId", "resourceType", "resourceId");

CREATE UNIQUE INDEX "EventParticipationAudienceEntry_eventId_kind_personId_key" ON "EventParticipationAudienceEntry"("eventId", "kind", "personId");
CREATE UNIQUE INDEX "EventParticipationAudienceEntry_eventId_kind_teamId_key" ON "EventParticipationAudienceEntry"("eventId", "kind", "teamId");
CREATE UNIQUE INDEX "EventParticipationAudienceEntry_eventId_kind_orgUnitId_key" ON "EventParticipationAudienceEntry"("eventId", "kind", "orgUnitId");
CREATE UNIQUE INDEX "EventParticipationAudienceEntry_eventId_kind_roleId_key" ON "EventParticipationAudienceEntry"("eventId", "kind", "roleId");
CREATE INDEX "EventParticipationAudienceEntry_tenantId_idx" ON "EventParticipationAudienceEntry"("tenantId");
CREATE INDEX "EventParticipationAudienceEntry_tenantId_eventId_idx" ON "EventParticipationAudienceEntry"("tenantId", "eventId");

-- AddForeignKey
ALTER TABLE "RequirementPlanningResourceReference" ADD CONSTRAINT "RequirementPlanningResourceReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementPlanningResourceReference" ADD CONSTRAINT "RequirementPlanningResourceReference_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementPlanningResourceReference" ADD CONSTRAINT "RequirementPlanningResourceReference_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventParticipationAudienceEntry" ADD CONSTRAINT "EventParticipationAudienceEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
