import { getParticipationForEvent } from "@/lib/participation/queries";
import { getMatchParticipationStatusPresentation } from "@/lib/match-squad/match-availability-presentation";
import type { PlanningParticipantsPresentation } from "@/lib/planning/planning-participant-types";
import { resolveTeamSeasonIdForTeamAndSeason } from "@/lib/planning/resolve-team-season-id";

export async function loadMatchPlanningParticipants(
  tenantId: string,
  input: {
    teamId: string | null | undefined;
    seasonId: string | null | undefined;
    matchEventId: string;
  },
): Promise<PlanningParticipantsPresentation> {
  const teamSeasonId = await resolveTeamSeasonIdForTeamAndSeason(
    tenantId,
    input.teamId,
    input.seasonId,
  );

  if (!teamSeasonId) {
    return { people: [], emptyStateKey: "noTeamSeason" };
  }

  const data = await getParticipationForEvent(tenantId, teamSeasonId, {
    eventKind: "MATCH",
    eventId: input.matchEventId,
  });

  return {
    people: data.players.map((player) => {
      const presentation = getMatchParticipationStatusPresentation(player.status);
      return {
        id: player.personId,
        displayName: player.displayName,
        role: "PLAYER",
        roleLabel: "Spieler",
        participationStatus: player.status,
        participationStatusLabel: presentation.label,
        participationStatusTone: presentation.tone,
        participationStatusIcon: presentation.icon,
      };
    }),
  };
}
