import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import { SCE_CANONICAL_TENANT_ORGANISER_CREST_URL } from "@/lib/sporting-activity-presentation/canonical/__fixtures__/sce-tournament-organiser-crest-fixtures";
import { buildSceActivityRoute } from "@/lib/sporting-activity-presentation/canonical/route";
import { buildSceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/status";
import type { SceClubEventPresentationModel } from "@/lib/sporting-activity-presentation/canonical/types";

export function createSceClubEventTimedFixture(
  overrides: Partial<SceClubEventPresentationModel> = {},
): SceClubEventPresentationModel {
  const resourceKey = "event:fixture-club-event-1";
  return {
    kind: "CLUB_EVENT",
    activityId: "fixture-club-event-1",
    resourceKey,
    typeLabel: "VERANSTALTUNG",
    eventTitle: "Clubabend",
    organiser: buildClubIdentity({
      displayName: "FC Allschwil",
      logoUrl: SCE_CANONICAL_TENANT_ORGANISER_CREST_URL,
    }),
    schedule: {
      startAt: "2026-10-24T16:00:00.000Z",
      endAt: "2026-10-24T20:00:00.000Z",
      allDay: false,
    },
    location: buildSportingActivityLocation({
      mode: "HOME",
      venueName: "Im Brüel",
      facilityResource: "Clubhaus",
    }),
    route: buildSceActivityRoute("CLUB_EVENT", resourceKey),
    status: buildSceActivityPresentationStatus({
      domain: "scheduled",
      label: "Geplant",
    }),
    ...overrides,
  };
}

export function createSceClubEventAllDayFixture(
  overrides: Partial<SceClubEventPresentationModel> = {},
): SceClubEventPresentationModel {
  return createSceClubEventTimedFixture({
    eventTitle: "Juniorentag",
    schedule: {
      startAt: "2026-10-24T00:00:00.000Z",
      endAt: "2026-10-25T00:00:00.000Z",
      allDay: true,
    },
    ...overrides,
  });
}

export function createSceClubEventLongTitleFixture(): SceClubEventPresentationModel {
  return createSceClubEventTimedFixture({
    eventTitle:
      "Grosser Vereinsanlass mit sehr langem Titel der in schmalen Layouts sauber umbrechen muss",
  });
}

export function createSceClubEventMissingOrganiserFixture(): SceClubEventPresentationModel {
  return createSceClubEventTimedFixture({
    organiser: undefined,
  });
}

export function createSceClubEventMissingLocationFixture(): SceClubEventPresentationModel {
  return createSceClubEventTimedFixture({
    location: buildSportingActivityLocation({ mode: "UNKNOWN" }),
  });
}
