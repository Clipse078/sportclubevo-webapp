import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import type { getFacilitiesForTenant } from "@/lib/facilities/queries";

type FacilitiesList = Awaited<ReturnType<typeof getFacilitiesForTenant>>;

export function buildFacilityGroupsByAllocationGroupFromFacilities(
  facilities: FacilitiesList,
): { PITCH_HALL: FacilityGroup[]; DRESSING_ROOM: FacilityGroup[] } {
  function groupsFor(group: "PITCH_HALL" | "DRESSING_ROOM"): FacilityGroup[] {
    return facilities
      .map((facility) => ({
        facilityId: facility.id,
        facilityName: facility.name,
        resources: facility.resources
          .filter((resource) => classifyFacilityResourceType(resource.type) === group)
          .map((resource) => ({
            id: resource.id,
            name: resource.name,
            code: resource.code,
            type: resource.type,
            facilityId: facility.id,
            facilityName: facility.name,
          })),
      }))
      .filter((facilityGroup) => facilityGroup.resources.length > 0);
  }

  return { PITCH_HALL: groupsFor("PITCH_HALL"), DRESSING_ROOM: groupsFor("DRESSING_ROOM") };
}
