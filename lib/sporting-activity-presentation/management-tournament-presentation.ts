import type { TournamentDto } from "@/lib/tournaments/types";
import { getTournamentParticipatingTeams } from "@/lib/tournaments/team-participation";
import {
  buildSportingActivityLocation,
  normalizeSportingLocationMode,
} from "./location";
import type { SportingActivityPresentation } from "./types";

/** Client-safe Turniere management identity (no server-only builder dependencies). */
export function buildTurniereManagementActivityPresentation(
  tournament: TournamentDto,
  tenantClubName?: string | null,
): SportingActivityPresentation {
  const mode = normalizeSportingLocationMode(tournament.homeAway);
  const organiser = tournament.organizerName?.trim();
  const organisingClub =
    organiser ?? (mode === "HOME" ? tenantClubName?.trim() || undefined : undefined);
  const teamName =
    tournament.team?.name?.trim() ||
    getTournamentParticipatingTeams(tournament)[0]?.name?.trim() ||
    undefined;
  const allocation = tournament.resourceAllocations[0];
  const pitch =
    allocation?.facilityResourceName?.trim() ||
    allocation?.facilityResourceCode?.trim() ||
    undefined;

  return {
    identity: {
      resourceKey: `event:${tournament.id}`,
      title: tournament.title,
      typeLabel: "Turnier",
      activityKind: "TOURNAMENT",
    },
    schedule: {
      startAt: tournament.startAt,
      endAt: tournament.endAt,
    },
    team: teamName ? { name: teamName } : undefined,
    context: organiser ? { organiser } : undefined,
    location: buildSportingActivityLocation({
      mode,
      hostOrOrganiser: organisingClub,
      venueName: tournament.location?.trim() || undefined,
      facilityResource: pitch,
    }),
  };
}
