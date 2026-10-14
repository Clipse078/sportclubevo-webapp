import { buildTournamentOrganiserClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";
import { buildSceActivityRoute } from "../route";
import type { SceTournamentPresentationModel } from "../types";

export type ResolveSceTournamentFromWeekplannerOptions = {
  /**
   * Legacy fallback when domain organiser name is absent on the item.
   * Crest resolution still uses item.organizerLogoUrl from domain — never a parallel tenant URL prop.
   */
  tenantClubName?: string | null;
};

export function resolveSceTournamentPresentationFromWeekplannerTournament(
  item: WeekplannerTournamentItem,
  options: ResolveSceTournamentFromWeekplannerOptions = {},
): SceTournamentPresentationModel {
  const resourceKey = `event:${item.eventId}`;
  const pitch = item.pitchAllocations[0] ?? item.canonicalPitchAllocations[0];
  const organiserName =
    item.organizerName?.trim() || options.tenantClubName?.trim() || undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: organiserName,
    venueName: pitch?.facilityName?.trim() || undefined,
    facilityResource: pitch?.name?.trim() || pitch?.code?.trim() || undefined,
  });

  const ownTeams = item.teamNames.map((name) => name.trim()).filter((name) => name.length > 0);
  const hauptteamName = ownTeams[0] || undefined;

  const organiser = buildTournamentOrganiserClubIdentity({
    title: item.title,
    organizerName: organiserName ?? null,
    organizerLogoUrl: item.organizerLogoUrl ?? null,
    organizerExternalClubId: item.organizerExternalClubId ?? null,
  });

  return {
    kind: "TOURNAMENT",
    activityId: item.eventId,
    resourceKey,
    typeLabel: "Turnier",
    tournamentTitle: item.title,
    organiser,
    hauptteam: hauptteamName ? { name: hauptteamName } : undefined,
    ownTeams: ownTeams.length > 0 ? ownTeams : undefined,
    schedule: {
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: false,
    },
    location,
    route: buildSceActivityRoute("TOURNAMENT", resourceKey),
  };
}
