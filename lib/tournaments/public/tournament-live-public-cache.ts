/**
 * Revalidate tenant website tournament surfaces when canonical schedule/results change.
 */

import { scheduleTenantPublicWebsiteCacheNotificationByTenantId } from "@/lib/website/public-cache-notification";
import { PUBLIC_CACHE_DOMAINS } from "@/lib/website/public-cache-tags";

export function notifyPublicTournamentLiveDataChanged(tenantId: string): void {
  void scheduleTenantPublicWebsiteCacheNotificationByTenantId(tenantId, [
    PUBLIC_CACHE_DOMAINS.TOURNAMENTS,
    PUBLIC_CACHE_DOMAINS.WEEKPLAN,
  ]);
}
