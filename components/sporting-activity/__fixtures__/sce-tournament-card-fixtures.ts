import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import {
  SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL,
  SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
  SCE_TOURNAMENT_FIXTURE_CREST_URLS,
} from "@/lib/sporting-activity-presentation/canonical/__fixtures__/sce-tournament-organiser-crest-fixtures";
import { buildSceActivityRoute } from "@/lib/sporting-activity-presentation/canonical/route";
import { buildSceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/status";
import type { SceTournamentPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

export { SCE_TOURNAMENT_FIXTURE_CREST_URLS };

const TENANT_CREST = SCE_CANONICAL_TENANT_ORGANISER_CREST_URL;
const EXTERNAL_CREST = SCE_CANONICAL_EXTERNAL_ORGANISER_CREST_URL;

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

/** Tenant-organised tournament with resolved tenant club crest (Tournamentcenter-style). */
export function createSceTournamentTenantOrganiserFixture(): SceTournamentPresentationModel {
  return createSceTournamentCardFixture({
    tournamentTitle: "PlayMore Turnier",
    organiser: buildClubIdentity({
      displayName: "FC Allschwil",
      logoUrl: TENANT_CREST,
    }),
    hauptteam: { name: "FC Allschwil Junioren F3" },
    location: buildSportingActivityLocation({
      mode: "HOME",
      hostOrOrganiser: "FC Allschwil",
      venueName: "Im Brüel",
      facilityResource: "Kunstrasen 2",
    }),
  });
}

/** External organiser with explicit crest URL from canonical tournament resolution. */
export function createSceTournamentExternalOrganiserFixture(): SceTournamentPresentationModel {
  return createSceTournamentCardFixture({
    organiser: buildClubIdentity({
      id: "club-external-aesch",
      displayName: "FC Aesch",
      logoUrl: EXTERNAL_CREST,
    }),
  });
}

/** Organiser without usable crest — initials/icon fallback only. */
export function createSceTournamentOrganiserFallbackFixture(): SceTournamentPresentationModel {
  return createSceTournamentCardFixture({
    organiser: buildClubIdentity({
      displayName: "FC Therwil",
      logoUrl: null,
    }),
  });
}

