/**
 * SCE-COLLAB-01C — club event (Event type=OTHER) snapshot for before/after comparison.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { formatClubEventTimingLabel } from "@/lib/events/club-event-scheduling";
import { dateKeyFromDate } from "@/lib/training/recurrence";
import {
  formatClubEventPlayableVenueLabel,
  formatClubEventResourceLabels,
  type ClubEventResourceRow,
} from "@/lib/collaboration/club-event/club-event-venue-presentation";

export type ClubEventActivitySnapshot = {
  eventId: string;
  tenantId: string;
  teamId: string | null;
  teamSeasonId: string | null;
  title: string;
  status: string;
  allDay: boolean;
  timezone: string;
  locale: string;
  dateKey: string;
  startTime: string | null;
  endTime: string | null;
  locationLabel: string | null;
  resourceLabel: string | null;
  playableVenueLabel: string | null;
  scheduleLine: string | null;
};

function formatWallTime(iso: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(iso);
}

function buildScheduleLine(input: {
  allDay: boolean;
  startAt: Date;
  endAt: Date | null;
  timezone: string;
  locale: string;
}): string | null {
  return formatClubEventTimingLabel(
    {
      allDay: input.allDay,
      startAt: input.startAt,
      endAt: input.endAt,
    },
    input.locale,
    input.timezone,
  );
}

export async function loadClubEventActivitySnapshot(input: {
  tenantId: string;
  eventId: string;
  locale?: string;
}): Promise<ClubEventActivitySnapshot | null> {
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId, type: "OTHER" },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      title: true,
      status: true,
      allDay: true,
      startAt: true,
      endAt: true,
      location: true,
      tenant: { select: { timezone: true } },
      eventFacilityAllocations: {
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          displayOrder: true,
          facilityResource: {
            select: {
              code: true,
              name: true,
              type: true,
              facility: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!event || !event.tenantId) return null;

  const timezone = resolveTenantEventTimezone(event.tenant?.timezone);
  const locale = input.locale ?? "de-CH";
  const dateKey = dateKeyFromDate(event.startAt);
  const startTime = event.allDay ? null : formatWallTime(event.startAt, timezone);
  const endTime =
    event.allDay || !event.endAt ? null : formatWallTime(event.endAt, timezone);

  const resourceRows: ClubEventResourceRow[] = event.eventFacilityAllocations.map((row) => ({
    code: row.facilityResource.code,
    name: row.facilityResource.name,
    facilityName: row.facilityResource.facility.name,
    resourceType: row.facilityResource.type,
    displayOrder: row.displayOrder,
  }));
  const resourceLabel = formatClubEventResourceLabels(resourceRows);
  const locationLabel = event.location?.trim() || null;
  const playableVenueLabel = formatClubEventPlayableVenueLabel({
    location: event.location,
    resourceLabel,
  });

  return {
    eventId: event.id,
    tenantId: event.tenantId,
    teamId: event.teamId,
    teamSeasonId: event.teamSeasonId,
    title: event.title,
    status: event.status,
    allDay: event.allDay,
    timezone,
    locale,
    dateKey,
    startTime,
    endTime,
    locationLabel,
    resourceLabel,
    playableVenueLabel,
    scheduleLine: buildScheduleLine({
      allDay: event.allDay,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone,
      locale,
    }),
  };
}
