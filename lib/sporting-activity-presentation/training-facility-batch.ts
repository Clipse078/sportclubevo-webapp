/**
 * Tenant-scoped batch resolution of training occurrence facility hints
 * for personal programme presentation (venue + pitch/hall when known).
 */

import { prisma } from "@/lib/db/prisma";
import {
  resolveTrainingOccurrenceAllocations,
  resolveTrainingOccurrencePrimaryPlayableAllocation,
  type TrainingAllocationResourceRow,
} from "@/lib/training/effective-training-allocation-resolution";

export type TrainingSessionFacilityHint = {
  facilityName: string | null;
  pitchResourceName: string | null;
  dressingRoomName: string | null;
};

type SessionRef = {
  id: string;
  trainingSeriesId: string;
};

function pickPitchResourceName(
  rows: readonly TrainingAllocationResourceRow[],
): string | null {
  const pitch = rows[0]?.facilityResource;
  if (!pitch) return null;
  return pitch.name?.trim() || pitch.code?.trim() || null;
}

function pickFacilityName(rows: readonly TrainingAllocationResourceRow[]): string | null {
  const resource = rows[0]?.facilityResource;
  return resource?.facility.name?.trim() || null;
}

function pickDressingRoomName(rows: readonly TrainingAllocationResourceRow[]): string | null {
  const labels = rows
    .map((row) => {
      const resource = row.facilityResource;
      return resource?.name?.trim() || resource?.code?.trim() || null;
    })
    .filter((value): value is string => Boolean(value));
  if (labels.length === 0) return null;
  return labels.join(", ");
}

export async function loadTrainingSessionFacilityHints(
  tenantId: string,
  sessions: readonly SessionRef[],
): Promise<Map<string, TrainingSessionFacilityHint>> {
  const result = new Map<string, TrainingSessionFacilityHint>();
  if (sessions.length === 0) return result;

  const sessionIds = sessions.map((s) => s.id);
  const seriesIds = [...new Set(sessions.map((s) => s.trainingSeriesId))];

  const [sessionAllocRows, seriesAllocRows] = await Promise.all([
    prisma.trainingSessionAllocation.findMany({
      where: { tenantId, trainingSessionId: { in: sessionIds } },
      select: {
        trainingSessionId: true,
        displayOrder: true,
        createdAt: true,
        facilityResource: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            facility: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.trainingAllocation.findMany({
      where: { tenantId, trainingSeriesId: { in: seriesIds } },
      select: {
        trainingSeriesId: true,
        displayOrder: true,
        createdAt: true,
        facilityResource: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            facility: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  const sessionRowsBySessionId = new Map<string, TrainingAllocationResourceRow[]>();
  for (const row of sessionAllocRows) {
    const mapped: TrainingAllocationResourceRow = {
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      facilityResource: row.facilityResource,
    };
    const bucket = sessionRowsBySessionId.get(row.trainingSessionId);
    if (bucket) bucket.push(mapped);
    else sessionRowsBySessionId.set(row.trainingSessionId, [mapped]);
  }

  const seriesRowsBySeriesId = new Map<string, TrainingAllocationResourceRow[]>();
  for (const row of seriesAllocRows) {
    const mapped: TrainingAllocationResourceRow = {
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      facilityResource: row.facilityResource,
    };
    const bucket = seriesRowsBySeriesId.get(row.trainingSeriesId);
    if (bucket) bucket.push(mapped);
    else seriesRowsBySeriesId.set(row.trainingSeriesId, [mapped]);
  }

  for (const session of sessions) {
    const sessionRows = sessionRowsBySessionId.get(session.id) ?? [];
    const seriesRows = seriesRowsBySeriesId.get(session.trainingSeriesId) ?? [];

    const resolved = resolveTrainingOccurrenceAllocations({
      seriesRows,
      sessionOverrideRows: sessionRows,
    });
    const primaryPlayable =
      resolved.pitch.length > 0
        ? resolved.pitch
        : resolved.otherPlayable.length > 0
          ? resolved.otherPlayable
          : resolveTrainingOccurrencePrimaryPlayableAllocation({
              seriesRows,
              sessionOverrideRows: sessionRows,
            });

    result.set(session.id, {
      facilityName: pickFacilityName(primaryPlayable),
      pitchResourceName: pickPitchResourceName(primaryPlayable),
      dressingRoomName: pickDressingRoomName(resolved.dressingRoom),
    });
  }

  return result;
}
