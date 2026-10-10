/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — member-facing Match availability wording.
 */

export type MatchParticipationResponseChoice = "YES" | "NO" | "MAYBE";

export const MATCH_PARTICIPATION_RESPONSE_LABELS: Record<
  MatchParticipationResponseChoice,
  string
> = {
  YES: "Verfügbar",
  NO: "Nicht verfügbar",
  MAYBE: "Unsicher",
};

export function getParticipationResponseButtonLabel(input: {
  eventKind: "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";
  status: MatchParticipationResponseChoice;
}): string {
  if (input.eventKind === "MATCH") {
    return MATCH_PARTICIPATION_RESPONSE_LABELS[input.status];
  }
  switch (input.status) {
    case "YES":
      return "Dabei";
    case "NO":
      return "Nicht dabei";
    case "MAYBE":
      return "Vielleicht";
    default:
      return input.status;
  }
}
