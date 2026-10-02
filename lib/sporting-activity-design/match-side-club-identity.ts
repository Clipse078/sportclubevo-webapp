import { resolveMatchcenterCompactSideName } from "@/lib/matchcenter/team-display";
import type { MatchcenterSide } from "@/lib/matchcenter/types";
import { buildClubIdentity, type ClubIdentity } from "./club-identity";
import { resolveMatchSideClubLogoUrl } from "./logo-resolution";

export function buildClubIdentityFromMatchSide(
  side: MatchcenterSide,
  tenantLogoUrl: string | null | undefined,
): ClubIdentity {
  const displayName =
    resolveMatchcenterCompactSideName(side) ||
    side.displayName?.trim() ||
    side.providerTeamName?.trim() ||
    "Unbekannt";

  const shortName =
    side.canonicalTeamShortName ??
    side.canonicalExternalTeamShortName ??
    null;

  const id =
    side.canonicalExternalClubId ??
    side.canonicalTeamId ??
    side.canonicalExternalTeamId ??
    undefined;

  return buildClubIdentity({
    id,
    externalAssociationId: side.providerTeamId,
    displayName,
    shortName,
    logoUrl: resolveMatchSideClubLogoUrl(side, tenantLogoUrl),
  });
}
