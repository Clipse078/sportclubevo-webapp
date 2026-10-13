import { prisma } from "@/lib/db/prisma";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";
import { findTeamSeasonsForTenant } from "@/lib/training/queries";
import { loadTrainingEffectiveGovernanceForSession } from "@/lib/training/composer/load-effective-governance-server";

export type TrainingComposerCreateSurfaceProps = {
  teamSeasons: Array<{
    id: string;
    teamId: string;
    teamName: string;
    seasonName: string;
    category?: string;
    genderGroup?: string | null;
  }>;
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  timeZone: string;
  defaultTrainingDurationMinutes: number;
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

/** Serializable props for TrainingCreateForm in overlay mode (management, Wochenplaner). */
export async function loadTrainingComposerCreateSurfaceProps({
  tenantId,
  userId,
  timeZone,
}: {
  tenantId: string;
  userId: string;
  timeZone: string;
}): Promise<TrainingComposerCreateSurfaceProps> {
  const policy = createPlanningAuthorizationPolicy(prisma);

  const [teamSeasons, facilities, writableTeamIds, operationalDurationPolicy, effectiveGovernance] =
    await Promise.all([
      findTeamSeasonsForTenant(tenantId),
      getFacilitiesForTenant(tenantId),
      policy.getWritableTeamIds({ userId, tenantId }, "training"),
      getTenantOperationalDurationPolicy(tenantId),
      loadTrainingEffectiveGovernanceForSession({ tenantId }),
    ]);

  const writableTeamIdSet = new Set(writableTeamIds);
  const filteredTeamSeasons =
    writableTeamIds.length > 0 ? teamSeasons.filter((ts) => writableTeamIdSet.has(ts.teamId)) : teamSeasons;

  return {
    teamSeasons: filteredTeamSeasons.map((ts) => ({
      id: ts.id,
      teamId: ts.teamId,
      teamName: ts.teamName,
      seasonName: ts.seasonName,
      category: ts.category ?? undefined,
      genderGroup: ts.genderGroup,
    })),
    pitchHallFacilityGroups: facilityGroupsForTypes(facilities, ["FULL_PITCH", "HALF_PITCH"]),
    dressingRoomFacilityGroups: facilityGroupsForTypes(facilities, ["DRESSING_ROOM"]),
    timeZone,
    defaultTrainingDurationMinutes: operationalDurationPolicy.TRAINING.durationMinutes,
    effectiveGovernance:
      effectiveGovernance ?? {
        activityType: "TRAINING",
        personId: "anonymous",
        mayCreate: true,
        publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
        approvalStrategy: "ANY_ONE",
        validatorPersonIds: [],
      },
  };
}
