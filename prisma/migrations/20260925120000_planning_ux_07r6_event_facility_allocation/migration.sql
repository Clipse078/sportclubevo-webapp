-- PLANNING-UX-07R6: canonical FacilityResource allocations for Veranstaltungen (Event.type=OTHER).

CREATE TABLE "EventFacilityAllocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "facilityResourceId" TEXT NOT NULL,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFacilityAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventFacilityAllocation_eventId_facilityResourceId_key" ON "EventFacilityAllocation"("eventId", "facilityResourceId");

CREATE INDEX "EventFacilityAllocation_tenantId_idx" ON "EventFacilityAllocation"("tenantId");
CREATE INDEX "EventFacilityAllocation_eventId_idx" ON "EventFacilityAllocation"("eventId");
CREATE INDEX "EventFacilityAllocation_facilityResourceId_idx" ON "EventFacilityAllocation"("facilityResourceId");
CREATE INDEX "EventFacilityAllocation_tenantId_eventId_idx" ON "EventFacilityAllocation"("tenantId", "eventId");
CREATE INDEX "EventFacilityAllocation_tenantId_facilityResourceId_idx" ON "EventFacilityAllocation"("tenantId", "facilityResourceId");

ALTER TABLE "EventFacilityAllocation" ADD CONSTRAINT "EventFacilityAllocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFacilityAllocation" ADD CONSTRAINT "EventFacilityAllocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventFacilityAllocation" ADD CONSTRAINT "EventFacilityAllocation_facilityResourceId_fkey" FOREIGN KEY ("facilityResourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
