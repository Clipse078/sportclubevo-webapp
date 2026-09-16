import type { TenantDressingRoomOccupancyPresets } from "./types";

/**
 * Platform defaults when a tenant row does not exist yet.
 * Match 60/45 aligns with WOCHENPLAN-2.0-01H-E2 occupancy tests;
 * Training/Tournament use symmetric 30/30 and 60/60 starter values.
 */
export const PLATFORM_DRESSING_ROOM_OCCUPANCY_PRESETS: TenantDressingRoomOccupancyPresets = {
  training: { beforeMinutes: 30, afterMinutes: 30 },
  match: { beforeMinutes: 60, afterMinutes: 45 },
  tournament: { beforeMinutes: 60, afterMinutes: 60 },
};
