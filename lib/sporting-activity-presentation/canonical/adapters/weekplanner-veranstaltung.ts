import { formatClubEventPlayableVenueLabel } from "@/lib/collaboration/club-event/club-event-venue-presentation";
import { buildClubIdentity, buildNameOnlyClubIdentity } from "@/lib/sporting-activity-design";
import { buildSportingActivityLocation } from "@/lib/sporting-activity-presentation/location";
import type { SportingActivityPresentation } from "@/lib/sporting-activity-presentation/types";
import type { WeekplannerVeranstaltungItem } from "@/lib/weekplanner/types";
import { resolveSceClubEventPresentationFromLegacy } from "./club-event";
import type { SceClubEventPresentationModel } from "../types";

export type ResolveSceClubEventFromWeekplannerOptions = {
  tenantClubName?: string | null;
  tenantLogoUrl?: string | null;
};

export function resolveSceClubEventPresentationFromWeekplannerVeranstaltung(
  item: WeekplannerVeranstaltungItem,
  options: ResolveSceClubEventFromWeekplannerOptions = {},
): SceClubEventPresentationModel {
  const facilityResourceLabel = item.pitchAllocations[0]?.name?.trim() ?? null;
  const venueLine = formatClubEventPlayableVenueLabel({
    location: item.location,
    resourceLabel: facilityResourceLabel,
  });
  const organiserName = options.tenantClubName?.trim() || undefined;

  const legacy: SportingActivityPresentation = {
    identity: {
      resourceKey: `event:${item.eventId}`,
      title: item.title,
      typeLabel: "VERANSTALTUNG",
      activityKind: "EVENT",
    },
    schedule: {
      startAt: item.startAt.toISOString(),
      endAt: item.endAt.toISOString(),
      allDay: item.allDay,
    },
    context: organiserName ? { organiser: organiserName } : undefined,
    location: buildSportingActivityLocation({
      mode: "UNKNOWN",
      hostOrOrganiser: organiserName,
      venueName: venueLine ?? item.location?.trim() ?? undefined,
    }),
  };

  const organiserIdentity =
    organiserName && options.tenantLogoUrl?.trim()
      ? buildClubIdentity({
          displayName: organiserName,
          logoUrl: options.tenantLogoUrl.trim(),
        })
      : organiserName
        ? buildNameOnlyClubIdentity(organiserName)
        : undefined;

  return resolveSceClubEventPresentationFromLegacy(legacy, {
    organiserDisplayName: organiserName,
    organiserIdentity,
  });
}
