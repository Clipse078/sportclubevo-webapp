/**
 * SCE-COLLAB-01B — tournament (Event type=TOURNAMENT) snapshot for change detection.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { dateKeyFromDate } from "@/lib/training/recurrence";
import {
  formatTournamentPlayableVenueLabel,
  formatTournamentResourceLabels,
  type TournamentResourceRow,
} from "@/lib/collaboration/tournament/tournament-venue-presentation";

export type TournamentActivitySnapshot = {
  tournamentId: string;
  tenantId: string;
  teamId: string | null;
  teamName: string | null;
  teamSeasonId: string | null;
  title: string;
  status: string;
  timezone: string;
  locale: string;
  dateKey: string;
  startTime: string;
  endTime: string;
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
  dateKey: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locale: string;
}): string | null {
  try {
    const dateLabel = new Intl.DateTimeFormat(input.locale, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: input.timezone,
    }).format(new Date(`${input.dateKey}T12:00:00`));
    return `${dateLabel} · ${input.startTime}–${input.endTime}`;
  } catch {
    return `${input.dateKey} · ${input.startTime}–${input.endTime}`;
  }
}

export async function loadTournamentActivitySnapshot(input: {
  tenantId: string;
  tournamentId: string;
  locale?: string;
}): Promise<TournamentActivitySnapshot | null> {
  const event = await prisma.event.findFirst({
    where: { id: input.tournamentId, tenantId: input.tenantId, type: "TOURNAMENT" },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      title: true,
      status: true,
      startAt: true,
      endAt: true,
      location: true,
      team: { select: { name: true } },
      tenant: { select: { timezone: true } },
      tournamentResourceAllocations: {
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
  const endAt = event.endAt ?? event.startAt;
  const dateKey = dateKeyFromDate(event.startAt);
  const startTime = formatWallTime(event.startAt, timezone);
  const endTime = formatWallTime(endAt, timezone);

  const resourceRows: TournamentResourceRow[] = event.tournamentResourceAllocations.map(
    (row) => ({
      code: row.facilityResource.code,
      name: row.facilityResource.name,
      facilityName: row.facilityResource.facility.name,
      resourceType: row.facilityResource.type,
      displayOrder: row.displayOrder,
    }),
  );
  const resourceLabel = formatTournamentResourceLabels(resourceRows);
  const playableVenueLabel = formatTournamentPlayableVenueLabel({
    location: event.location,
    resourceLabel,
  });

  return {
    tournamentId: event.id,
    tenantId: event.tenantId,
    teamId: event.teamId,
    teamName: event.team?.name ?? null,
    teamSeasonId: event.teamSeasonId,
    title: event.title,
    status: event.status,
    timezone,
    locale,
    dateKey,
    startTime,
    endTime,
    playableVenueLabel,
    scheduleLine: buildScheduleLine({ dateKey, startTime, endTime, timezone, locale }),
  };
}
