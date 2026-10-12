/**
 * Canonical crest URL resolution for presentation ClubIdentity builders.
 * No network I/O — callers pass pre-resolved URLs from domain/loaders.
 */

import type { MatchcenterSide } from "@/lib/matchcenter/types";
import { resolveTenantClubCrestUrl } from "@/lib/sporting-data/sce-club-crest-resolution";

/**
 * Match club visual identity (01D R10):
 *   - Participant display name = team/participant label (e.g. Junioren B1).
 *   - Crest = owning club logo (tenant club or external club), never a team glyph.
 *
 * Match side logo hierarchy (see lib/matchcenter/club-identity.ts history):
 *   internal tenant Team (canonicalTeamId or isOwnTeam) → tenantLogoUrl (club crest)
 *   external → externalLogoUrl pre-resolved upstream (ExternalTeam/Club + provider enrichment)
 *
 * Crest availability is identity-driven — not fixture result state.
 */
export type MatchSideClubLogoInput = Pick<
  MatchcenterSide,
  "isOwnTeam" | "externalLogoUrl"
> & {
  canonicalTeamId?: MatchcenterSide["canonicalTeamId"];
};

export type MatchSideClubLogoTenantContext = {
  readonly tenantLogoUrl?: string | null;
  readonly ownCanonicalClubLogoUrl?: string | null;
};

export function resolveMatchSideClubLogoUrl(
  side: MatchSideClubLogoInput,
  tenantLogoUrl: string | null | undefined,
  tenantContext?: MatchSideClubLogoTenantContext,
): string | null {
  const isTenantClubParticipant =
    side.isOwnTeam || Boolean(side.canonicalTeamId?.trim());

  if (isTenantClubParticipant) {
    return resolveTenantClubCrestUrl({
      tenantLogoUrl: tenantContext?.tenantLogoUrl ?? tenantLogoUrl,
      ownCanonicalClubLogoUrl: tenantContext?.ownCanonicalClubLogoUrl,
    });
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
