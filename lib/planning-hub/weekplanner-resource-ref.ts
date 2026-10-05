import type { FacilityResourceType } from "@prisma/client";
import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";
import type { ResourceOption } from "@/components/admin/training/FacilityResourceSelector";

/** Maps Prisma facility resource type to weekplanner conflict-capacity typing. */
export function weekplannerResourceTypeFromFacilityType(
  type: FacilityResourceType,
): NonNullable<WeekplannerResourceRef["resourceType"]> {
  if (type === "FULL_PITCH") return "FULL_PITCH";
  if (type === "HALF_PITCH") return "HALF_PITCH";
  if (type === "DRESSING_ROOM") return "DRESSING_ROOM";
  return "OTHER";
}

export function weekplannerResourceRefFromFacilityOption(resource: ResourceOption): WeekplannerResourceRef {
  return {
    facilityResourceId: resource.id,
    facilityId: resource.facilityId,
    code: resource.code,
    name: resource.name,
    facilityName: resource.facilityName,
    resourceType: weekplannerResourceTypeFromFacilityType(resource.type),
    occupancyBeforeMinutes: 0,
    occupancyAfterMinutes: 0,
  };
}
