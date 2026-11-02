/**
 * Tournament participant primary/secondary identity for Screen 1 ACTIVITY column.
 */

import type { InfoboardTeamAllocationPresentation } from "@/components/infoboard/screen1/screen1-presentation-types";

function meaningful(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type TournamentParticipantIdentityLines = {
  readonly primary: string;
  readonly secondary: string | null;
};

export function resolveTournamentParticipantIdentity(
  participant: InfoboardTeamAllocationPresentation,
): TournamentParticipantIdentityLines {
  const explicitClub = meaningful(participant.clubDisplayName);
  const explicitTeam = meaningful(participant.teamSubDisplayName);
  if (explicitClub) {
    return {
      primary: explicitClub,
      secondary: explicitTeam ?? null,
    };
  }

  const flat = meaningful(participant.teamDisplayName);
  if (!flat) return { primary: "", secondary: null };

  if (explicitTeam) {
    return { primary: flat, secondary: explicitTeam };
  }

  return { primary: flat, secondary: null };
}
