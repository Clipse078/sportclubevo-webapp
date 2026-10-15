import { getTournamentParticipatingTeams } from "@/lib/tournaments/team-participation";
import type { listTournaments } from "@/lib/tournaments/tournament-service";
import type { PersonProgrammeScope } from "./person-programme-scope";

type TournamentRow = Awaited<ReturnType<typeof listTournaments>>[number];

export function isTournamentRelevantToPersonProgrammeScope(
  tournament: TournamentRow,
  scope: PersonProgrammeScope,
): boolean {
  if (scope.relevantTeamIds.length === 0) {
    return false;
  }

  const relevantTeamIds = new Set(scope.relevantTeamIds);
  const relevantSeasonIds = new Set(scope.relevantTeamSeasonIds);

  if (tournament.team?.id && relevantTeamIds.has(tournament.team.id)) {
    return true;
  }

  if (
    tournament.teamSeasonId &&
    relevantSeasonIds.has(tournament.teamSeasonId)
  ) {
    return true;
  }

  const participating = getTournamentParticipatingTeams(tournament);
  return participating.some((team) => relevantTeamIds.has(team.id));
}
