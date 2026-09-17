/**
 * PLANNING-HUB-02E — per-request deduplication for stable reference reads.
 * React `cache()` scopes to one server render; safe for tenant-scoped data
 * when tenantId is part of the cache key (each call passes tenantId).
 */

import { cache } from "react";
import { getFacilitiesForTenant as loadFacilitiesForTenant } from "@/lib/facilities/queries";
import { getTenantDressingRoomOccupancyPresets as loadTenantDressingRoomOccupancyPresets } from "@/lib/dressing-room-occupancy/tenant-preset-service";
import { getTenantMatchOperationalPolicy as loadTenantMatchOperationalPolicy } from "@/lib/match/tenant-operational-policy-service";
import { getCurrentTenantContextById as loadCurrentTenantContextById } from "@/lib/tenants/context";
import { getTeamsListData as loadTeamsListData } from "@/lib/teams/queries";
import { getPersonProfileByUserId as loadPersonProfileByUserId } from "@/lib/people/queries";

export const getFacilitiesForTenantCached = cache((tenantId: string) =>
  loadFacilitiesForTenant(tenantId),
);

export const getTenantDressingRoomOccupancyPresetsCached = cache((tenantId: string) =>
  loadTenantDressingRoomOccupancyPresets(tenantId),
);

export const getTenantMatchOperationalPolicyCached = cache((tenantId: string) =>
  loadTenantMatchOperationalPolicy(tenantId),
);

export const getCurrentTenantContextByIdCached = cache((tenantId: string) =>
  loadCurrentTenantContextById(tenantId),
);

export const getTeamsListDataCached = cache(
  (tenantId: string, selectedSeasonKey?: string) =>
    loadTeamsListData(tenantId, selectedSeasonKey),
);

export const getPersonProfileByUserIdCached = cache((userId: string) =>
  loadPersonProfileByUserId(userId),
);
