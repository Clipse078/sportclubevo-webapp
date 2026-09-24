import type { TournamentDto } from "@/lib/tournaments/types";
import type { PlanningParticipantsPresentation } from "@/lib/planning/planning-participant-types";
import { getParticipationForEvent } from "@/lib/participation/queries";
import { resolveTeamSeasonIdForTeamAndSeason } from "@/lib/planning/resolve-team-season-id";

export async function loadTournamentPlanningParticipants(
  tenantId: string,
  tournament: TournamentDto,
): Promise<PlanningParticipantsPresentation> {
  const teams = tournament.participants.map((participant) => ({
    id: participant.id,
    displayName: participant.displayName,
    role: "TEAM" as const,
    roleLabel: "Team",
    subLabel: participant.kind === "EXTERNAL_CLUB" ? "Extern" : undefined,
    avatarUrl: participant.logoUrl,
  }));

  const teamSeasonId = await resolveTeamSeasonIdForTeamAndSeason(
    tenantId,
    tournament.team?.id ?? null,
    tournament.season?.id ?? null,
  );
  let people: PlanningParticipantsPresentation["people"] = [];

  if (teamSeasonId) {
    try {
      const data = await getParticipationForEvent(tenantId, teamSeasonId, {
        eventKind: "TOURNAMENT",
        eventId: tournament.id,
      });
      people = data.players.map((player) => ({
        id: player.personId,
        displayName: player.displayName,
        role: "PLAYER" as const,
        roleLabel: "Teilnahme (Hauptteam)",
        participationStatus: player.status,
        participationStatusLabel: player.statusLabel,
      }));
    } catch {
      people = [];
    }
  }

  return {
    teams,
    people,
    footnoteKey: people.length === 0 && teams.length > 0 ? "tournamentTeamsOnly" : undefined,
  };
}
