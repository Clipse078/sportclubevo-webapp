/**
 * PLANNING-HUB-02E — per-request deduplication for stable reference reads.
 * React `cache()` scopes to one server render; safe for tenant-scoped data
 * when tenantId is part of the cache key (each call passes tenantId).
 */

import { cache } from "react";
import { getFacilitiesForTenant as loadFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantDressingRoomOccupancyPresets as loadTenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/tenant-preset-service";

export const getFacilitiesForTenantCached = cache((tenantId: string) =>
  loadFacilitiesForTenant(tenantId),
);

export const getTenantDressingRoomOccupancyPresetsCached = cache((tenantId: string) =>
  loadTenantDressingRoomOccupancyPresets(tenantId),
);
