/**
 * SCE-TRAININGS-UX-01 — helpers for the Trainings management page.
 */

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
