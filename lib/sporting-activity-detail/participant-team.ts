import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";

export type SportingActivityDetailParticipantTeam = {
  label: string;
  identity: ClubIdentity;
};

function meaningful(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Compact participant team row — tenant crest + canonical club/team label. */
export function buildSportingActivityDetailParticipantTeam(input: {
  tenantClubName: string;
  tenantLogoUrl?: string | null;
  teamName?: string | null;
}): SportingActivityDetailParticipantTeam | undefined {
  const teamName = meaningful(input.teamName);
  const clubName = meaningful(input.tenantClubName) ?? "Verein";
  if (!teamName) {
    return undefined;
  }

  const label = teamName.toLowerCase().includes(clubName.toLowerCase())
    ? teamName
    : `${clubName} ${teamName}`;

  return {
    label,
    identity: buildClubIdentity({
      displayName: label,
      shortName: teamName,
      logoUrl: input.tenantLogoUrl ?? null,
    }),
  };
}
