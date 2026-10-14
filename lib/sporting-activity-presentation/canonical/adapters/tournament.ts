import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design";
import type { TournamentDto } from "@/lib/tournaments/types";
import { getTournamentParticipatingTeams } from "@/lib/tournaments/team-participation";
import { buildTurniereManagementActivityPresentation } from "@/lib/sporting-activity-presentation/management-tournament-presentation";
import { buildSceActivityRoute, parseActivityIdFromResourceKey } from "../route";
import { buildSceActivityPresentationStatus } from "../status";
import type { SceTournamentPresentationModel } from "../types";

export type ResolveSceTournamentPresentationInput = {
  tournament: TournamentDto;
  tenantClubName?: string | null;
};

export function resolveSceTournamentPresentation(
  input: ResolveSceTournamentPresentationInput,
): SceTournamentPresentationModel {
  const { tournament } = input;
  const legacy = buildTurniereManagementActivityPresentation(
    tournament,
    input.tenantClubName,
  );
  const resourceKey = legacy.identity.resourceKey;
  const organiser = buildTournamentOrganiserClubIdentity(tournament);
  const ownTeams = getTournamentParticipatingTeams(tournament).map((team) => team.name);

  return {
    kind: "TOURNAMENT",
    activityId: parseActivityIdFromResourceKey(resourceKey),
    resourceKey,
    typeLabel: legacy.identity.typeLabel,
    tournamentTitle: legacy.identity.title,
    organiser,
    hauptteam: legacy.team?.name ? { name: legacy.team.name } : undefined,
    ownTeams: ownTeams.length > 0 ? ownTeams : undefined,
    schedule: { ...legacy.schedule },
    location: { ...legacy.location },
    route: buildSceActivityRoute("TOURNAMENT", resourceKey),
    status: legacy.status
      ? buildSceActivityPresentationStatus({ domain: legacy.status })
      : undefined,
  };
}
