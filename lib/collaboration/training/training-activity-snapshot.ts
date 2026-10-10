/**
 * SCE-COLLAB-01A — training activity snapshot for before/after comparison.
 */

import { prisma } from "@/lib/db/prisma";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import { listAllocationsByTrainingSession } from "@/lib/training/session-allocation-service";
import {
  resolveTrainingOccurrenceAllocations,
  type TrainingAllocationResourceRow,
} from "@/lib/training/effective-training-allocation-resolution";
import type { TrainingAllocationDto, TrainingSessionAllocationDto } from "@/lib/training/types";
import {
  formatTrainingDressingRoomLabel,
  formatTrainingPlayableVenueLabel,
} from "@/lib/collaboration/training/training-venue-presentation";
import { dateKeyFromDate } from "@/lib/training/recurrence";

export type TrainingActivitySnapshot = {
  sessionId: string;
  tenantId: string;
  teamId: string;
  teamName: string;
  teamSeasonId: string;
  title: string;
  status: string;
  timezone: string;
  locale: string;
  dateKey: string;
  startTime: string;
  endTime: string;
  playableVenueLabel: string | null;
  dressingRoomLabel: string | null;
  scheduleLine: string | null;
};

function mapAllocationRow(
  row: TrainingAllocationDto | TrainingSessionAllocationDto,
): TrainingAllocationResourceRow {
  return {
    displayOrder: row.displayOrder,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    facilityResource: {
      id: row.facilityResourceId,
      code: row.facilityResourceCode,
      name: row.facilityResourceName,
      type: row.facilityResourceType,
      facility: { id: row.facilityId, name: row.facilityName },
    },
  };
}

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

type LoadedTrainingSessionRow = {
  id: string;
  tenantId: string;
  status: string;
  date: Date;
  startAt: Date;
  endAt: Date;
  overrideDate: Date | null;
  overrideStartAt: Date | null;
  overrideEndAt: Date | null;
  teamSeasonId: string;
  trainingSeriesId: string;
  trainingSeries: { title: string; timezone: string };
  teamSeason: { teamId: string; team: { name: string } };
};

export function buildTrainingActivitySnapshotFromLoadedSession(input: {
  session: LoadedTrainingSessionRow;
  seriesAllocations: TrainingAllocationDto[];
  sessionAllocations: TrainingSessionAllocationDto[];
  locale?: string;
}): TrainingActivitySnapshot {
  const timezone = input.session.trainingSeries.timezone;
  const effectiveStart = input.session.overrideStartAt ?? input.session.startAt;
  const effectiveEnd = input.session.overrideEndAt ?? input.session.endAt;
  const effectiveDate = input.session.overrideDate ?? input.session.date;
  const dateKey = dateKeyFromDate(effectiveDate);
  const startTime = formatWallTime(effectiveStart, timezone);
  const endTime = formatWallTime(effectiveEnd, timezone);

  const resolved = resolveTrainingOccurrenceAllocations({
    seriesRows: input.seriesAllocations.map(mapAllocationRow),
    sessionOverrideRows: input.sessionAllocations.map(mapAllocationRow),
  });

  const locale = input.locale ?? "de-CH";
  const playableVenueLabel = formatTrainingPlayableVenueLabel(resolved);
  const dressingRoomLabel = formatTrainingDressingRoomLabel(resolved);

  return {
    sessionId: input.session.id,
    tenantId: input.session.tenantId,
    teamId: input.session.teamSeason.teamId,
    teamName: input.session.teamSeason.team.name,
    teamSeasonId: input.session.teamSeasonId,
    title: input.session.trainingSeries.title,
    status: input.session.status,
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

export async function loadTrainingActivitySnapshot(input: {
  tenantId: string;
  sessionId: string;
  locale?: string;
}): Promise<TrainingActivitySnapshot | null> {
  const session = await prisma.trainingSession.findFirst({
    where: { id: input.sessionId, tenantId: input.tenantId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      date: true,
      startAt: true,
      endAt: true,
      overrideDate: true,
      overrideStartAt: true,
      overrideEndAt: true,
      teamSeasonId: true,
      trainingSeriesId: true,
      trainingSeries: { select: { title: true, timezone: true } },
      teamSeason: { select: { teamId: true, team: { select: { name: true } } } },
    },
  });
  if (!session) return null;

  const [seriesAllocations, sessionAllocations] = await Promise.all([
    listAllocationsByTrainingSeries(input.tenantId, session.trainingSeriesId),
    listAllocationsByTrainingSession(input.tenantId, session.id),
  ]);

  return buildTrainingActivitySnapshotFromLoadedSession({
    session,
    seriesAllocations,
    sessionAllocations,
    locale: input.locale,
  });
}
