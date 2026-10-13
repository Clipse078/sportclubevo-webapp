import type { ClubEvent } from "@/lib/events/club-events-service";
import { formatClubEventPlayableVenueLabel } from "@/lib/collaboration/club-event/club-event-venue-presentation";
import { buildSportingActivityLocation } from "./location";
import type { SportingActivityPresentation } from "./types";

/** Client-safe Veranstaltungen management identity (no server-only dependencies). */
export function buildVeranstaltungenManagementActivityPresentation(
  event: ClubEvent,
  options: { facilityResourceLabel?: string | null } = {},
): SportingActivityPresentation {
  const venueLine = formatClubEventPlayableVenueLabel({
    location: event.location,
    resourceLabel: options.facilityResourceLabel,
  });

  const organiser = event.organizerName?.trim() || undefined;

  return {
    identity: {
      resourceKey: `event:${event.id}`,
      title: event.title,
      typeLabel: "VERANSTALTUNG",
      activityKind: "EVENT",
    },
    schedule: {
      startAt: event.startAt instanceof Date ? event.startAt.toISOString() : String(event.startAt),
      endAt: event.endAt
        ? event.endAt instanceof Date
          ? event.endAt.toISOString()
          : String(event.endAt)
        : null,
      allDay: event.allDay,
    },
    context: organiser ? { organiser } : undefined,
    location: buildSportingActivityLocation({
      mode: "UNKNOWN",
      hostOrOrganiser: organiser,
      venueName: venueLine ?? event.location?.trim() ?? undefined,
    }),
  };
}
