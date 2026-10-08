-- SCE-PLANNER-UX-08-08C/R1 — historical FacilityResource codes for legacy Match fields.

CREATE TABLE "FacilityResourceCodeAlias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "facilityResourceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityResourceCodeAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityResourceCodeAlias_tenantId_code_key" ON "FacilityResourceCodeAlias"("tenantId", "code");

CREATE INDEX "FacilityResourceCodeAlias_tenantId_idx" ON "FacilityResourceCodeAlias"("tenantId");

CREATE INDEX "FacilityResourceCodeAlias_tenantId_facilityResourceId_idx" ON "FacilityResourceCodeAlias"("tenantId", "facilityResourceId");

ALTER TABLE "FacilityResourceCodeAlias" ADD CONSTRAINT "FacilityResourceCodeAlias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FacilityResourceCodeAlias" ADD CONSTRAINT "FacilityResourceCodeAlias_facilityResourceId_fkey" FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
