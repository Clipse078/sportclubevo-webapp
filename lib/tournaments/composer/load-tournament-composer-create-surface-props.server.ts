import { prisma } from "@/lib/db/prisma";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";
import { loadTournamentEffectiveGovernanceForSession } from "./load-effective-governance-server";

export type TournamentTeamOption = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
};

export type TournamentSeasonOption = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
};

export type TournamentComposerCreateSurfaceProps = {
  activeSeasonId: string;
  seasonOptions: TournamentSeasonOption[];
  teamOptions: TournamentTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
  defaultTournamentDurationMinutes: number;
  effectiveGovernance: SceActivityEffectiveGovernance;
  tenantClubName: string;
  tenantLogoUrl: string | null;
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

export async function loadTournamentComposerCreateSurfaceProps(input: {
  tenantId: string;
  userId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): Promise<TournamentComposerCreateSurfaceProps> {
  const policy = createPlanningAuthorizationPolicy(prisma);

  const [facilities, writableTeamIds, seasons, operationalDurationPolicy, effectiveGovernance] =
    await Promise.all([
      getFacilitiesForTenant(input.tenantId),
      policy.getWritableTeamIds({ userId: input.userId, tenantId: input.tenantId }, "tournament"),
      prisma.season.findMany({
        orderBy: { startDate: "desc" },
        select: { id: true, key: true, name: true, isActive: true },
      }),
      getTenantOperationalDurationPolicy(input.tenantId),
      loadTournamentEffectiveGovernanceForSession({ tenantId: input.tenantId }),
    ]);

  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const teamRows =
    writableTeamIds.length > 0
      ? await prisma.team.findMany({
          where: { tenantId: input.tenantId, id: { in: [...writableTeamIds] }, isActive: true },
          select: { id: true, name: true, ageGroup: true, genderGroup: true },
          orderBy: { name: "asc" },
        })
      : await prisma.team.findMany({
          where: { tenantId: input.tenantId, isActive: true },
          select: { id: true, name: true, ageGroup: true, genderGroup: true },
          orderBy: { name: "asc" },
        });

  return {
    activeSeasonId: activeSeason?.id ?? "",
    seasonOptions: seasons.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      isActive: s.isActive,
    })),
    teamOptions: teamRows.map((t) => ({
      id: t.id,
      name: t.name,
      ageGroup: t.ageGroup,
      genderGroup: t.genderGroup,
    })),
    pitchHallFacilityGroups: facilityGroupsForTypes(facilities, ["FULL_PITCH", "HALF_PITCH"]),
    dressingRoomFacilityGroups: facilityGroupsForTypes(facilities, ["DRESSING_ROOM"]),
    defaultTournamentDurationMinutes: operationalDurationPolicy.TOURNAMENT.durationMinutes,
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    effectiveGovernance:
      effectiveGovernance ?? {
        activityType: "TOURNAMENT",
        personId: "anonymous",
        mayCreate: true,
        publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
        approvalStrategy: "ANY_ONE",
        validatorPersonIds: [],
      },
  };
}
