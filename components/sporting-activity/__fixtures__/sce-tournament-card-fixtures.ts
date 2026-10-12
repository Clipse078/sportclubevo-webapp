import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { buildSceActivityRoute } from "@/lib/sporting-activity-presentation/canonical/route";
import { buildSceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/status";
import type { SceTournamentPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

export function createSceTournamentCardFixture(
  overrides: Partial<SceTournamentPresentationModel> = {},
): SceTournamentPresentationModel {
  const resourceKey = "event:fixture-tournament-1";
  return {
    kind: "TOURNAMENT",
    activityId: "fixture-tournament-1",
    resourceKey,
    typeLabel: "Turnier",
    tournamentTitle: "Junioren F Turnier",
    organiser: buildClubIdentity({
      displayName: "FC Arisdorf",
      logoUrl: null,
    }),
    hauptteam: { name: "Junioren F2" },
    schedule: {
      startAt: "2026-10-10T07:30:00.000Z",
      endAt: "2026-10-10T09:30:00.000Z",
    },
    location: buildSportingActivityLocation({
      mode: "AWAY",
      hostOrOrganiser: "FC Arisdorf",
      venueName: "Gemeindesportplatz",
      facilityResource: "Platz 1",
    }),
    route: buildSceActivityRoute("TOURNAMENT", resourceKey),
    status: buildSceActivityPresentationStatus({ domain: "scheduled", label: "Geplant" }),
    ...overrides,
  };
}
