import type { TournamentSpielplanFixturePresentation } from "@/lib/tournaments/spielplan/types";
import type { TournamentSpielplanParticipantOption } from "@/lib/tournaments/spielplan/types";
import type { TournamentPlanungFixtureSidePresentation } from "@/lib/tournaments/planung/types";

export function buildSpielplanFixtureSidePresentation(input: {
  fixture: TournamentSpielplanFixturePresentation;
  side: "A" | "B";
  participants: readonly TournamentSpielplanParticipantOption[];
}): TournamentPlanungFixtureSidePresentation {
  const { fixture, side, participants } = input;
  const isA = side === "A";
  const participantId = isA ? fixture.sideAParticipantId : fixture.sideBParticipantId;
  const label = isA ? fixture.sideALabel : fixture.sideBLabel;
  const isPlaceholder = isA ? fixture.sideAIsPlaceholder : fixture.sideBIsPlaceholder;
  const participant = participantId
    ? participants.find((p) => p.participantId === participantId)
    : undefined;

  return {
    label,
    crestUrl: participant?.crestUrl ?? null,
    isPlaceholder,
    participantId,
    qualificationProvenanceLabel: null,
  };
}
