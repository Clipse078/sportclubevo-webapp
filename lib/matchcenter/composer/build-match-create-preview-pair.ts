import { buildMatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import type { MatchcenterMatchSummary } from "@/lib/matchcenter/types";

export function buildMatchCreatePreviewSummary(input: {
  tenantClubName: string;
  tenantLogoUrl: string | null;
  tenantTeamName: string;
  homeAway: "HOME" | "AWAY";
  opponentClubName: string;
  opponentTeamName: string;
  opponentExternalClubId: string | null;
  opponentExternalLogoUrl?: string | null;
}): Pick<MatchcenterMatchSummary, "home" | "away"> {
  const tenantSide = {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: "tenant-team",
    canonicalTeamName: input.tenantTeamName || null,
    canonicalTeamShortName: input.tenantTeamName || null,
    displayName: input.tenantClubName,
    resolution: "RESOLVED" as const,
    isOwnTeam: true,
    externalLogoUrl: input.tenantLogoUrl,
  };

  const opponentSide = {
    providerTeamId: null,
    providerTeamName: null,
    canonicalTeamId: null,
    canonicalTeamName: null,
    canonicalExternalTeamName: input.opponentTeamName || null,
    canonicalExternalTeamShortName: input.opponentTeamName || null,
    displayName: input.opponentClubName || input.opponentTeamName || "Gegner",
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
