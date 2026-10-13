import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";

export function buildMatchCreatePreviewSummary(input: {
  tenantClubName: string;
  tenantLogoUrl: string | null;
  teamDisplayName: string;
  homeAway: "HOME" | "AWAY";
  opponentDisplayName: string;
  opponentExternalClubId: string | null;
  opponentExternalLogoUrl?: string | null;
}): Pick<MatchcenterMatchSummary, "home" | "away"> {
  const tenantSide = {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: "tenant-team",
    canonicalTeamName: input.teamDisplayName || input.tenantClubName,
    displayName: input.teamDisplayName || input.tenantClubName,
    resolution: "RESOLVED" as const,
    isOwnTeam: true,
    externalLogoUrl: input.tenantLogoUrl,
  };

  const opponentSide = {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    displayName: input.opponentDisplayName || "Gegner",
    resolution: "RESOLVED" as const,
    isOwnTeam: false,
    canonicalExternalClubId: input.opponentExternalClubId,
    externalLogoUrl: input.opponentExternalLogoUrl ?? null,
  };

  if (input.homeAway === "HOME") {
    return { home: tenantSide, away: opponentSide };
  }
  return { home: opponentSide, away: tenantSide };
}

export function buildMatchCreatePreviewClubPair(
  input: Parameters<typeof buildMatchCreatePreviewSummary>[0],
) {
  const sides = buildMatchCreatePreviewSummary(input);
  return buildMatchClubIdentityPair(sides, input.tenantLogoUrl);
}
