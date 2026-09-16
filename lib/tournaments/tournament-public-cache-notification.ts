/**
 * Maps Tournament publication field changes to tenant-website cache domains.
 * Infoboard is served from SCE directly — no external website notification.
 */

import type { UpdateTournamentInput } from "./types";
import {
  PUBLIC_CACHE_DOMAINS,
  type PublicCacheDomain,
} from "@/lib/website/public-cache-tags";

const PUBLICATION_KEYS: (keyof UpdateTournamentInput)[] = [
  "websiteVisible",
  "infoboardVisible",
  "homepageVisible",
  "wochenplanVisible",
  "teamPageVisible",
];

/**
 * Returns cache domains that should be revalidated when the given publication
 * fields are present in an update payload (undefined = unchanged).
 */
export function resolveTournamentPublicationCacheDomains(
  input: UpdateTournamentInput,
): PublicCacheDomain[] {
  const domains = new Set<PublicCacheDomain>();

  const touches = (key: keyof UpdateTournamentInput) => input[key] !== undefined;

  if (touches("websiteVisible")) {
    domains.add(PUBLIC_CACHE_DOMAINS.TOURNAMENTS);
    domains.add(PUBLIC_CACHE_DOMAINS.WEEKPLAN);
    domains.add(PUBLIC_CACHE_DOMAINS.HOMEPAGE);
  }

  if (touches("homepageVisible")) {
    domains.add(PUBLIC_CACHE_DOMAINS.HOMEPAGE);
  }

  if (touches("wochenplanVisible")) {
    domains.add(PUBLIC_CACHE_DOMAINS.WEEKPLAN);
  }

  if (touches("teamPageVisible")) {
    domains.add(PUBLIC_CACHE_DOMAINS.TOURNAMENTS);
  }

  // infoboardVisible: SCE Infoboard is dynamic; no tenant-website tag.

  return [...domains];
}

export function updateTouchesPublicationVisibility(input: UpdateTournamentInput): boolean {
  return PUBLICATION_KEYS.some((key) => input[key] !== undefined);
}
