import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";
import { buildSceMatchTenantSideContextBadge } from "../match-context-badges";
import { resolveSceMatchLifecycleStatus } from "../match-lifecycle-status";
import { buildSceActivityRoute } from "../route";
import type { SceMatchPresentationModel } from "../types";

export function resolveSceMatchPresentationFromWeekplannerMatch(
  item: WeekplannerMatchItem,
  options?: { now?: Date; timezone?: string },
): SceMatchPresentationModel {
  const resourceKey = `event:${item.eventId}`;
  const home = buildClubIdentity({
    displayName: item.homeSide.displayName,
    logoUrl: item.homeSide.logoUrl,
  });
  const away = buildClubIdentity({
    displayName: item.awaySide.displayName,
    logoUrl: item.awaySide.logoUrl,
  });

  const pitchLabel =
    item.pitchAllocations[0]?.name?.trim() ||
    item.canonicalPitchAllocations[0]?.name?.trim() ||
    undefined;

  const location = buildSportingActivityLocation({
    mode: "HOME",
    hostOrOrganiser: undefined,
    venueName: null,
    facilityResource: pitchLabel,
  });

  const tenantSide = buildSceMatchTenantSideContextBadge(item.homeAway);
  const contextBadges = tenantSide ? [tenantSide] : undefined;

  const matchLifecycle = resolveSceMatchLifecycleStatus({
    match: {
      status: "SCHEDULED",
      startAt: item.startAt,
      synchronization: {
        eventLastSyncedAt: null,
        mappingLastSyncedAt: null,
        detailSyncedAt: null,
        providerMatchState: null,
        providerMatchStateName: null,
      },
      kickoffKnown: true,
    },
    now: options?.now,
    timezone: options?.timezone,
  });

  return {
    kind: "MATCH",
    activityId: item.eventId,
    resourceKey,
    typeLabel: "SPIEL",
    schedule: {
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: false,
    },
    location,
    route: buildSceActivityRoute("MATCH", resourceKey),
    status: matchLifecycle,
    matchLifecycle,
    fixture: {
      home,
      away,
      homeLeftAwayRightInvariant: true,
    },
    result: null,
    contextBadges,
  };
}
