/**
 * Canonical crest URL resolution for presentation ClubIdentity builders.
 * No network I/O — callers pass pre-resolved URLs from domain/loaders.
 */

import type { MatchcenterSide } from "@/lib/matchcenter/types";

/**
 * Match side logo hierarchy (see lib/matchcenter/club-identity.ts history):
 *   tenant club participant (internal Team) → Tenant.logoUrl (club crest)
 *   external → ExternalTeam/ExternalClub crest (externalLogoUrl on side)
 *
 * Crest availability is identity-driven — not fixture result state.
 */
export type MatchSideClubLogoInput = Pick<
  MatchcenterSide,
  "isOwnTeam" | "externalLogoUrl"
> & {
  canonicalTeamId?: MatchcenterSide["canonicalTeamId"];
};

export function resolveMatchSideClubLogoUrl(
  side: MatchSideClubLogoInput,
  tenantLogoUrl: string | null | undefined,
): string | null {
  const isTenantClubParticipant =
    side.isOwnTeam || Boolean(side.canonicalTeamId?.trim());

  if (isTenantClubParticipant) {
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
