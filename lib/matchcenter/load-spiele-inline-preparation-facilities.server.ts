import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { getFacilitiesForTenant } from "@/lib/facilities/queries";
import { buildMatchOperationalFacilityGroups } from "@/lib/matchcenter/facility-groups-for-match-pickers";

export type SpieleInlinePreparationFacilityGroups = {
  pitchHallFacilityGroups: FacilityGroup[];
  dressingRoomFacilityGroups: FacilityGroup[];
};

export async function loadSpieleInlinePreparationFacilityGroups(
  tenantId: string,
): Promise<SpieleInlinePreparationFacilityGroups> {
  const facilities = await getFacilitiesForTenant(tenantId);
  return {
    pitchHallFacilityGroups: buildMatchOperationalFacilityGroups(facilities, "PITCH_HALL"),
    dressingRoomFacilityGroups: buildMatchOperationalFacilityGroups(facilities, "DRESSING_ROOM"),
  };
}
