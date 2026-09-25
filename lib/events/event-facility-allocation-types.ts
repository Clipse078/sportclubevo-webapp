import type { FacilityResourceType } from "@prisma/client";

export type EventFacilityAllocationDto = {
  id: string;
  facilityResourceId: string;
  facilityResourceCode: string;
  facilityResourceName: string;
  facilityResourceType: FacilityResourceType | string;
  facilityId: string;
  facilityName: string;
  notes: string | null;
  displayOrder: number;
};

export type CreateEventFacilityAllocationInput = {
  facilityResourceId: string;
  notes?: string | null;
  displayOrder?: number;
};

export type ReplaceEventFacilityAllocationInput = {
  facilityResourceId: string;
};
