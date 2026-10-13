import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design/tournament-organiser-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { resolveTenantClubCrestUrl } from "@/lib/sporting-data/sce-club-crest-resolution";
import type { WeekplannerTournamentItem } from "@/lib/weekplanner/types";
import { buildSceActivityRoute } from "../route";
import type { SceTournamentPresentationModel } from "../types";

export type ResolveSceTournamentFromWeekplannerOptions = {
  /** HOME tournaments on the tenant plan — organiser context when domain name is not on the item. */
  tenantClubName?: string | null;
  /** Tenant club crest for HOME organiser (canonical 01D tenant crest pipeline). */
  tenantLogoUrl?: string | null;
};

export function resolveSceTournamentPresentationFromWeekplannerTournament(
  item: WeekplannerTournamentItem,
  options: ResolveSceTournamentFromWeekplannerOptions = {},
): SceTournamentPresentationModel {
  const resourceKey = `event:${item.eventId}`;
  const pitch = item.pitchAllocations[0] ?? item.canonicalPitchAllocations[0];
  const organiserName = options.tenantClubName?.trim() || undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: organiserName,
    venueName: pitch?.facilityName?.trim() || undefined,
    facilityResource: pitch?.name?.trim() || pitch?.code?.trim() || undefined,
  });

  const hauptteamName = item.teamNames[0]?.trim() || undefined;

  const organiser =
    organiserName != null
      ? buildClubIdentity({
          displayName: organiserName,
          logoUrl: resolveTenantClubCrestUrl({
            tenantLogoUrl: options.tenantLogoUrl,
          }),
        })
      : buildNameOnlyClubIdentity(item.title);

  return {
    kind: "TOURNAMENT",
    activityId: item.eventId,
    resourceKey,
    typeLabel: "Turnier",
    tournamentTitle: item.title,
    organiser,
    hauptteam: hauptteamName ? { name: hauptteamName } : undefined,
    schedule: {
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: false,
    },
    location,
    route: buildSceActivityRoute("TOURNAMENT", resourceKey),
  };
}
