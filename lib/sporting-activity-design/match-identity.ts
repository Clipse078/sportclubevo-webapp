import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";
import type { ClubIdentity } from "./club-identity";
import { buildClubIdentityFromMatchSide } from "./match-side-club-identity";

/**
 * Canonical match club pairing — HOME always left, AWAY always right.
 * Tenant position does not alter ordering.
 */
export type MatchClubIdentityPair = {
  homeClubIdentity: ClubIdentity;
  awayClubIdentity: ClubIdentity;
};

export function buildMatchClubIdentityPair(
  match: Pick<MatchcenterMatchSummary, "home" | "away">,
  tenantLogoUrl: string | null | undefined,
): MatchClubIdentityPair {
  return {
    homeClubIdentity: buildClubIdentityFromMatchSide(match.home, tenantLogoUrl),
    awayClubIdentity: buildClubIdentityFromMatchSide(match.away, tenantLogoUrl),
  };
}
