import type { WeekplannerResourceRef } from "@/lib/weekplanner/types";
import type { ResolvedDressingRoomOccupancy } from "./types";

export function applyDressingRoomOccupancyToRefs(
  refs: readonly WeekplannerResourceRef[],
  occupancy: ResolvedDressingRoomOccupancy,
): WeekplannerResourceRef[] {
  return refs.map((ref) => ({
    ...ref,
    occupancyBeforeMinutes: occupancy.beforeMinutes,
    occupancyAfterMinutes: occupancy.afterMinutes,
  }));
}
