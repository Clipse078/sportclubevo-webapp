/**
 * Canonical crest URL resolution for presentation ClubIdentity builders.
 * No network I/O — callers pass pre-resolved URLs from domain/loaders.
 */

import type { MatchcenterSide } from "@/lib/matchcenter/types";

/**
 * Match side logo hierarchy (see lib/matchcenter/club-identity.ts history):
 *   own team → Tenant.logoUrl
 *   external → ExternalTeam/ExternalClub crest (externalLogoUrl on side)
 */
export function resolveMatchSideClubLogoUrl(
  side: Pick<MatchcenterSide, "isOwnTeam" | "externalLogoUrl">,
  tenantLogoUrl: string | null | undefined,
): string | null {
  if (side.isOwnTeam) {
    return tenantLogoUrl?.trim() || null;
  }
  return side.externalLogoUrl?.trim() || null;
}

/**
 * Tournament organiser crest — only explicit organizerLogoUrl from canonical tournament resolution.
 * Does not infer organiser from participating team or HOME/Away tenant branding.
 */
export function resolveTournamentOrganiserClubLogoUrl(
  organizerLogoUrl: string | null | undefined,
): string | null {
  return organizerLogoUrl?.trim() || null;
}
