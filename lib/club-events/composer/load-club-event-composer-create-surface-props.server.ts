import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";
import { loadClubEventEffectiveGovernanceForSession } from "@/lib/club-events/composer/load-effective-governance-server";

export type ClubEventComposerCreateSurfaceProps = {
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  otherFacilityGroups: FacilityGroup[];
  timeZone: string;
  effectiveGovernance: SceActivityEffectiveGovernance;
};

function facilityGroupsForTypes(
  facilities: Awaited<ReturnType<typeof getFacilitiesForTenant>>,
  types: readonly string[],
): FacilityGroup[] {
  return facilities
    .filter((f) => f.status !== "ARCHIVED")
    .map((f) => ({
      facilityId: f.id,
      facilityName: f.name,
      facilityType: f.type as string,
      resources: f.resources
        .filter((r) => r.status !== "ARCHIVED" && types.includes(r.type))
        .map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          type: r.type,
          facilityId: f.id,
          facilityName: f.name,
          facilityType: f.type as string,
        })),
    }))
    .filter((fg) => fg.resources.length > 0);
}

/** Serializable props for VeranstaltungCreateForm in overlay mode. */
export async function loadClubEventComposerCreateSurfaceProps({
  tenantId,
  timeZone,
}: {
  tenantId: string;
  timeZone: string;
}): Promise<ClubEventComposerCreateSurfaceProps> {
  const [facilities, effectiveGovernance] = await Promise.all([
    getFacilitiesForTenant(tenantId),
    loadClubEventEffectiveGovernanceForSession({ tenantId }),
  ]);

  return {
    pitchHallFacilityGroups: facilityGroupsForTypes(facilities, ["FULL_PITCH", "HALF_PITCH"]),
    dressingRoomFacilityGroups: facilityGroupsForTypes(facilities, ["DRESSING_ROOM"]),
    otherFacilityGroups: facilityGroupsForTypes(facilities, ["OTHER"]),
    timeZone,
    effectiveGovernance:
      effectiveGovernance ?? {
        activityType: "CLUB_EVENT",
        personId: "anonymous",
        mayCreate: true,
        publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
        approvalStrategy: "ANY_ONE",
        validatorPersonIds: [],
      },
  };
}
