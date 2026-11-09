import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import type { getFacilitiesForTenant } from "@/lib/facilities/queries";

/**
 * Builds canonical facility groups for match operational pickers (tenant facilities).
 */
export function buildMatchOperationalFacilityGroups(
  facilities: Awaited<ReturnType<typeof getFacilitiesForTenant>>,
  group: "PITCH_HALL" | "DRESSING_ROOM",
): FacilityGroup[] {
  return facilities
    .map((facility) => ({
      facilityId: facility.id,
      facilityName: facility.name,
      facilityType: facility.type as string,
      resources: facility.resources
        .filter((resource) => classifyFacilityResourceType(resource.type) === group)
        .map((resource) => ({
          id: resource.id,
          name: resource.name,
          code: resource.code,
          type: resource.type,
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type as string,
        })),
    }))
    .filter((fg) => fg.resources.length > 0);
}

/** Match events persist resource codes — visual pickers key selections by code. */
export function facilityGroupsWithCodeAsId(groups: FacilityGroup[]): FacilityGroup[] {
  return groups.map((fg) => ({
    ...fg,
    resources: fg.resources.map((r) => ({ ...r, id: r.code })),
  }));
}

export function resourceLabelFromCode(
  groups: FacilityGroup[] | null | undefined,
  code: string,
): string {
  if (!code.trim() || !groups) return code;
  for (const fg of groups) {
    const resource = fg.resources.find((r) => r.id === code);
    if (resource) return resource.name;
  }
  return code;
}
