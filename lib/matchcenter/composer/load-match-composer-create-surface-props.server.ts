import { prisma } from "@/lib/db/prisma";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { createPlanningAuthorizationPolicy } from "@/lib/planning/planning-authorization-policy";
import type { SceActivityEffectiveGovernance } from "@/lib/sce/activity-governance/types";
import { SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY } from "@/lib/sce/activity-governance/types";
import { loadMatchEffectiveGovernanceForSession } from "./load-effective-governance-server";

export type MatchTeamOption = {
  id: string;
  name: string;
  ageGroup: string | null;
  genderGroup: string | null;
};

export type MatchComposerCreateSurfaceProps = {
  activeSeasonId: string;
  teamOptions: MatchTeamOption[];
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
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

export async function loadMatchComposerCreateSurfaceProps(input: {
  tenantId: string;
  userId: string;
  tenantClubName: string;
  tenantLogoUrl: string | null;
}): Promise<MatchComposerCreateSurfaceProps> {
  const policy = createPlanningAuthorizationPolicy(prisma);

  const [facilities, writableTeamIds, seasons, effectiveGovernance] = await Promise.all([
    getFacilitiesForTenant(input.tenantId),
    policy.getWritableTeamIds({ userId: input.userId, tenantId: input.tenantId }, "match"),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, isActive: true },
    }),
    loadMatchEffectiveGovernanceForSession({ tenantId: input.tenantId }),
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
    teamOptions: teamRows.map((t) => ({
      id: t.id,
      name: t.name,
      ageGroup: t.ageGroup,
      genderGroup: t.genderGroup,
    })),
    pitchHallFacilityGroups: facilityGroupsForTypes(facilities, ["FULL_PITCH", "HALF_PITCH"]),
    dressingRoomFacilityGroups: facilityGroupsForTypes(facilities, ["DRESSING_ROOM"]),
    tenantClubName: input.tenantClubName,
    tenantLogoUrl: input.tenantLogoUrl,
    effectiveGovernance:
      effectiveGovernance ?? {
        activityType: "MATCH",
        personId: "anonymous",
        mayCreate: true,
        publicationAuthority: SCE_ACTIVITY_DEFAULT_PUBLICATION_AUTHORITY,
        approvalStrategy: "ANY_ONE",
        validatorPersonIds: [],
      },
  };
}
