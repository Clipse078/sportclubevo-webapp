/**
 * SCE-COLLAB-01D — batch snapshots for all sessions in a training series.
 */

import { prisma } from "@/lib/db/prisma";
import {
  buildTrainingActivitySnapshotFromLoadedSession,
  type TrainingActivitySnapshot,
} from "@/lib/collaboration/training/training-activity-snapshot";
import { listAllocationsByTrainingSeries } from "@/lib/training/training-allocation-service";
import type { TrainingSessionAllocationDto } from "@/lib/training/types";

export async function listTrainingSessionIdsForSeries(input: {
  tenantId: string;
  trainingSeriesId: string;
}): Promise<string[]> {
  const rows = await prisma.trainingSession.findMany({
    where: { tenantId: input.tenantId, trainingSeriesId: input.trainingSeriesId },
    select: { id: true },
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });
  return rows.map((row) => row.id);
}

function mapSessionAllocationRow(row: {
  id: string;
  tenantId: string;
  trainingSessionId: string;
  facilityResourceId: string;
  notes: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  facilityResource: {
    name: string;
    code: string;
    type: string;
    facilityId: string;
    facility: { name: string };
  };
}): TrainingSessionAllocationDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    trainingSessionId: row.trainingSessionId,
    facilityResourceId: row.facilityResourceId,
    facilityResourceName: row.facilityResource.name,
    facilityResourceCode: row.facilityResource.code,
    facilityResourceType: row.facilityResource.type,
    facilityId: row.facilityResource.facilityId,
    facilityName: row.facilityResource.facility.name,
    notes: row.notes,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function loadTrainingSeriesActivitySnapshots(input: {
  tenantId: string;
  trainingSeriesId: string;
  locale?: string;
}): Promise<Map<string, TrainingActivitySnapshot>> {
  const sessions = await prisma.trainingSession.findMany({
    where: { tenantId: input.tenantId, trainingSeriesId: input.trainingSeriesId },
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
    orderBy: [{ date: "asc" }, { startAt: "asc" }],
  });

  if (sessions.length === 0) return new Map();

  const [seriesAllocations, sessionAllocationRows] = await Promise.all([
    listAllocationsByTrainingSeries(input.tenantId, input.trainingSeriesId),
    prisma.trainingSessionAllocation.findMany({
      where: {
        tenantId: input.tenantId,
        trainingSessionId: { in: sessions.map((row) => row.id) },
      },
      include: {
        facilityResource: {
          select: {
            name: true,
            code: true,
            type: true,
            facilityId: true,
            facility: { select: { name: true } },
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const allocationsBySessionId = new Map<string, TrainingSessionAllocationDto[]>();
  for (const row of sessionAllocationRows) {
    const dto = mapSessionAllocationRow(row);
    const list = allocationsBySessionId.get(row.trainingSessionId) ?? [];
    list.push(dto);
    allocationsBySessionId.set(row.trainingSessionId, list);
  }

  const map = new Map<string, TrainingActivitySnapshot>();
  for (const session of sessions) {
    const snapshot = buildTrainingActivitySnapshotFromLoadedSession({
      session,
      seriesAllocations,
      sessionAllocations: allocationsBySessionId.get(session.id) ?? [],
      locale: input.locale,
    });
    map.set(session.id, snapshot);
  }
  return map;
}
