/**
 * SCE-COLLAB-01B — match (Event type=MATCH) snapshot for before/after comparison.
 */

import { prisma } from "@/lib/db/prisma";
import { resolveTenantEventTimezone } from "@/lib/events/tenant-local-datetime";
import { resolveMatchOperationalInterval } from "@/lib/match/resolve-match-operational-interval";
import { getTenantMatchOperationalPolicy } from "@/lib/match/tenant-operational-policy-service";
import { isKnownKickoffForMatch } from "@/lib/match/kickoff-semantics";
import { dateKeyFromDate } from "@/lib/training/recurrence";
import {
  formatMatchHomeDressingRoomLabel,
  formatMatchPitchLabel,
  formatMatchPlayableVenueLabel,
  type MatchPitchResourceContext,
} from "@/lib/collaboration/match/match-venue-presentation";

export type MatchActivitySnapshot = {
  matchId: string;
  tenantId: string;
  teamId: string | null;
  teamName: string | null;
  teamSeasonId: string | null;
  title: string;
  status: string;
  source: string;
  timezone: string;
  locale: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  playableVenueLabel: string | null;
  dressingRoomLabel: string | null;
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

async function loadResourceMaps(tenantId: string): Promise<{
  pitchByCode: Map<string, MatchPitchResourceContext>;
  dressingByCode: Map<string, MatchPitchResourceContext>;
}> {
  const resources = await prisma.facilityResource.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    select: {
      code: true,
      name: true,
      type: true,
      facility: { select: { name: true } },
    },
  });

  const pitchByCode = new Map<string, MatchPitchResourceContext>();
  const dressingByCode = new Map<string, MatchPitchResourceContext>();

  for (const row of resources) {
    const ctx: MatchPitchResourceContext = {
      code: row.code,
      name: row.name,
      facilityName: row.facility.name,
      resourceType: row.type as MatchPitchResourceContext["resourceType"],
    };
    if (row.type === "DRESSING_ROOM") {
      dressingByCode.set(row.code, ctx);
    } else {
      pitchByCode.set(row.code, ctx);
    }
  }

  return { pitchByCode, dressingByCode };
}

export async function loadMatchActivitySnapshot(input: {
  tenantId: string;
  matchId: string;
  locale?: string;
}): Promise<MatchActivitySnapshot | null> {
  const event = await prisma.event.findFirst({
    where: { id: input.matchId, tenantId: input.tenantId, type: "MATCH" },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      teamSeasonId: true,
      title: true,
      status: true,
      source: true,
      startAt: true,
      endAt: true,
      operationalEndAtOverride: true,
      location: true,
      pitchCode: true,
      homeDressingRoomCode: true,
      team: { select: { name: true } },
      tenant: { select: { timezone: true } },
    },
  });
  if (!event || !event.tenantId) return null;

  const timezone = resolveTenantEventTimezone(event.tenant?.timezone);
  const locale = input.locale ?? "de-CH";
  const kickoffKnown = isKnownKickoffForMatch({
    startAt: event.startAt,
    eventSource: event.source,
  });
  const policy = await getTenantMatchOperationalPolicy(input.tenantId);
  const interval = resolveMatchOperationalInterval({
    startAt: event.startAt,
    authoritativeEndAt: event.endAt,
    operationalEndAtOverride: event.operationalEndAtOverride,
    tenantPolicy: policy,
    kickoffKnown,
  });

  const dateKey = dateKeyFromDate(event.startAt);
  const startTime = formatWallTime(event.startAt, timezone);
  const endTime = formatWallTime(interval.endAt, timezone);

  const { pitchByCode, dressingByCode } = await loadResourceMaps(input.tenantId);
  const pitchLabel = formatMatchPitchLabel(event.pitchCode, pitchByCode);
  const playableVenueLabel = formatMatchPlayableVenueLabel({
    location: event.location,
    pitchLabel,
  });
  const dressingRoomLabel = formatMatchHomeDressingRoomLabel(
    event.homeDressingRoomCode,
    dressingByCode,
  );

  return {
    matchId: event.id,
    tenantId: event.tenantId,
    teamId: event.teamId,
    teamName: event.team?.name ?? null,
    teamSeasonId: event.teamSeasonId,
    title: event.title,
    status: event.status,
    source: event.source,
    timezone,
    locale,
    dateKey,
    startTime,
    endTime,
    playableVenueLabel,
    dressingRoomLabel,
    scheduleLine: buildScheduleLine({ dateKey, startTime, endTime, timezone, locale }),
  };
}
