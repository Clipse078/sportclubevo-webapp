/**
 * Tenant-scoped batch resolution of training occurrence facility hints
 * for personal programme presentation (venue + pitch/hall when known).
 */

import { prisma } from "@/lib/db/prisma";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import { resolveTrainingOccurrenceAllocations } from "@/lib/training/effective-training-allocation-resolution";

export type TrainingSessionFacilityHint = {
  facilityName: string | null;
  pitchResourceName: string | null;
};

type SessionRef = {
  id: string;
  trainingSeriesId: string;
};

function pickPitchResourceName(
  groups: ReturnType<typeof resolveTrainingOccurrenceAllocations>,
): string | null {
  const pitch = groups.pitch[0]?.facilityResource;
  if (!pitch) return null;
  return pitch.name?.trim() || pitch.code?.trim() || null;
}

function pickFacilityName(
  groups: ReturnType<typeof resolveTrainingOccurrenceAllocations>,
): string | null {
  const resource = groups.pitch[0]?.facilityResource ?? groups.dressingRoom[0]?.facilityResource;
  return resource?.facility.name?.trim() || null;
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

  const sessionRowsBySessionId = new Map<string, typeof sessionAllocRows>();
  for (const row of sessionAllocRows) {
    const bucket = sessionRowsBySessionId.get(row.trainingSessionId);
    if (bucket) bucket.push(row);
    else sessionRowsBySessionId.set(row.trainingSessionId, [row]);
  }

  const seriesRowsBySeriesId = new Map<string, typeof seriesAllocRows>();
  for (const row of seriesAllocRows) {
    const bucket = seriesRowsBySeriesId.get(row.trainingSeriesId);
    if (bucket) bucket.push(row);
    else seriesRowsBySeriesId.set(row.trainingSeriesId, [row]);
  }

  for (const session of sessions) {
    const sessionRows =
      sessionRowsBySessionId.get(session.id)?.map((row) => ({
        displayOrder: row.displayOrder,
        createdAt: row.createdAt,
        facilityResource: row.facilityResource,
      })) ?? [];

    const seriesRows =
      seriesRowsBySeriesId.get(session.trainingSeriesId)?.map((row) => ({
        displayOrder: row.displayOrder,
        createdAt: row.createdAt,
        facilityResource: row.facilityResource,
      })) ?? [];

    const pitchSession = sessionRows.filter(
      (row) => classifyFacilityResourceType(row.facilityResource.type) === "PITCH_HALL",
    );
    const pitchSeries = seriesRows.filter(
      (row) => classifyFacilityResourceType(row.facilityResource.type) === "PITCH_HALL",
    );
    const dressingSession = sessionRows.filter(
      (row) => classifyFacilityResourceType(row.facilityResource.type) === "DRESSING_ROOM",
    );
    const dressingSeries = seriesRows.filter(
      (row) => classifyFacilityResourceType(row.facilityResource.type) === "DRESSING_ROOM",
    );

    const groups = resolveTrainingOccurrenceAllocations({
      seriesRows: [...pitchSeries, ...dressingSeries],
      sessionOverrideRows: [...pitchSession, ...dressingSession],
    });

    result.set(session.id, {
      facilityName: pickFacilityName(groups),
      pitchResourceName: pickPitchResourceName(groups),
    });
  }

  return result;
}
