import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { TournamentSpielplanParticipantOption } from "@/lib/tournaments/spielplan/types";

export function participantIdentityFromSpielplan(
  participants: readonly TournamentSpielplanParticipantOption[],
  participantId: string | null,
  displayName: string,
  isPlaceholder: boolean,
) {
  const participant = participantId
    ? participants.find((p) => p.participantId === participantId)
    : undefined;
  return buildClubIdentity({
    id: participantId ?? undefined,
    displayName: participant?.displayName ?? displayName,
    logoUrl: participant?.crestUrl ?? null,
    preferNeutralIcon: isPlaceholder,
  });
}
