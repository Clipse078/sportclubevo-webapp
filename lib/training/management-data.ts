/**
 * SCE-TRAININGS-UX-01 — helpers for the Trainings management page.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveLongTeamName } from "@/lib/teams/team-naming";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import { findTeamSeasonsForTenant } from "@/lib/training/queries";

export async function listTeamSeasonFilterOptions(tenantId: string): Promise<
  { id: string; label: string }[]
> {
  const rows = await findTeamSeasonsForTenant(tenantId);
  return rows.map((row) => ({
    id: row.id,
    label: row.teamName,
  }));
}

export async function listTeamSeasonDisplayNamesForManagement(
  tenantId: string,
  teamSeasonIds: readonly string[],
): Promise<Map<string, string>> {
  if (teamSeasonIds.length === 0) return new Map();

  const rows = await prisma.teamSeason.findMany({
    where: { id: { in: [...teamSeasonIds] }, team: { tenantId } },
    select: {
      id: true,
      displayName: true,
      team: {
        select: {
          name: true,
          shortName: true,
          alternativeName: true,
        },
      },
      externalMappings: {
        orderBy: { lastSyncedAt: "desc" },
        take: 1,
        select: { providerTeamName: true },
      },
    },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      resolveLongTeamName({
        teamName: row.team.name,
        teamShortName: row.team.shortName,
        teamAlternativeName: row.team.alternativeName,
        teamSeasonDisplayName: row.displayName,
        providerTeamName: row.externalMappings[0]?.providerTeamName ?? null,
      }) ?? row.team.name,
    ]),
  );
}

export function buildPitchNameBySeriesId(
  allocationsBySeriesId: ReadonlyMap<
    string,
    readonly { facilityResourceType: string; facilityResourceName: string }[]
  >,
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const [seriesId, allocations] of allocationsBySeriesId) {
    const pitch = allocations.find(
      (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
    );
    map.set(seriesId, pitch?.facilityResourceName ?? null);
  }
  return map;
}
