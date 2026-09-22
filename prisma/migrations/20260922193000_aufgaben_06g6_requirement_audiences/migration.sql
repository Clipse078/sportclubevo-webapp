-- AUFGABEN-06G6 — Requirement draft audience selectors (TEAM, ORG_UNIT, ROLE, TARGET_GROUP)

CREATE TABLE "RequirementDraftAudienceTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraftAudienceTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementDraftAudienceOrgUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraftAudienceOrgUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementDraftAudienceRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraftAudienceRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementDraftAudienceTargetGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "targetGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementDraftAudienceTargetGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequirementDraftAudienceTeam_requirementId_teamId_key" ON "RequirementDraftAudienceTeam"("requirementId", "teamId");
CREATE INDEX "RequirementDraftAudienceTeam_tenantId_idx" ON "RequirementDraftAudienceTeam"("tenantId");
CREATE INDEX "RequirementDraftAudienceTeam_tenantId_requirementId_idx" ON "RequirementDraftAudienceTeam"("tenantId", "requirementId");
CREATE INDEX "RequirementDraftAudienceTeam_tenantId_teamId_idx" ON "RequirementDraftAudienceTeam"("tenantId", "teamId");

CREATE UNIQUE INDEX "RequirementDraftAudienceOrgUnit_requirementId_orgUnitId_key" ON "RequirementDraftAudienceOrgUnit"("requirementId", "orgUnitId");
CREATE INDEX "RequirementDraftAudienceOrgUnit_tenantId_idx" ON "RequirementDraftAudienceOrgUnit"("tenantId");
CREATE INDEX "RequirementDraftAudienceOrgUnit_tenantId_requirementId_idx" ON "RequirementDraftAudienceOrgUnit"("tenantId", "requirementId");
CREATE INDEX "RequirementDraftAudienceOrgUnit_tenantId_orgUnitId_idx" ON "RequirementDraftAudienceOrgUnit"("tenantId", "orgUnitId");

CREATE UNIQUE INDEX "RequirementDraftAudienceRole_requirementId_roleId_key" ON "RequirementDraftAudienceRole"("requirementId", "roleId");
CREATE INDEX "RequirementDraftAudienceRole_tenantId_idx" ON "RequirementDraftAudienceRole"("tenantId");
CREATE INDEX "RequirementDraftAudienceRole_tenantId_requirementId_idx" ON "RequirementDraftAudienceRole"("tenantId", "requirementId");
CREATE INDEX "RequirementDraftAudienceRole_tenantId_roleId_idx" ON "RequirementDraftAudienceRole"("tenantId", "roleId");

CREATE UNIQUE INDEX "RequirementDraftAudienceTargetGroup_requirementId_targetGroupId_key" ON "RequirementDraftAudienceTargetGroup"("requirementId", "targetGroupId");
CREATE INDEX "RequirementDraftAudienceTargetGroup_tenantId_idx" ON "RequirementDraftAudienceTargetGroup"("tenantId");
CREATE INDEX "RequirementDraftAudienceTargetGroup_tenantId_requirementId_idx" ON "RequirementDraftAudienceTargetGroup"("tenantId", "requirementId");
CREATE INDEX "RequirementDraftAudienceTargetGroup_tenantId_targetGroupId_idx" ON "RequirementDraftAudienceTargetGroup"("tenantId", "targetGroupId");

ALTER TABLE "RequirementDraftAudienceTeam" ADD CONSTRAINT "RequirementDraftAudienceTeam_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceTeam" ADD CONSTRAINT "RequirementDraftAudienceTeam_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceTeam" ADD CONSTRAINT "RequirementDraftAudienceTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequirementDraftAudienceOrgUnit" ADD CONSTRAINT "RequirementDraftAudienceOrgUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceOrgUnit" ADD CONSTRAINT "RequirementDraftAudienceOrgUnit_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceOrgUnit" ADD CONSTRAINT "RequirementDraftAudienceOrgUnit_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequirementDraftAudienceRole" ADD CONSTRAINT "RequirementDraftAudienceRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceRole" ADD CONSTRAINT "RequirementDraftAudienceRole_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceRole" ADD CONSTRAINT "RequirementDraftAudienceRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RequirementDraftAudienceTargetGroup" ADD CONSTRAINT "RequirementDraftAudienceTargetGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceTargetGroup" ADD CONSTRAINT "RequirementDraftAudienceTargetGroup_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDraftAudienceTargetGroup" ADD CONSTRAINT "RequirementDraftAudienceTargetGroup_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "TargetGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
