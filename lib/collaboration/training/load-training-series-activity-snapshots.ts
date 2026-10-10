/**
 * SCE-COLLAB-01D — batch snapshots for all sessions in a training series.
 */

import { prisma } from "@/lib/db/prisma";
import { loadTrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";
import type { TrainingActivitySnapshot } from "@/lib/collaboration/training/training-activity-snapshot";

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

export async function loadTrainingSeriesActivitySnapshots(input: {
  tenantId: string;
  trainingSeriesId: string;
  locale?: string;
}): Promise<Map<string, TrainingActivitySnapshot>> {
  const sessionIds = await listTrainingSessionIdsForSeries({
    tenantId: input.tenantId,
    trainingSeriesId: input.trainingSeriesId,
  });

  const map = new Map<string, TrainingActivitySnapshot>();
  for (const sessionId of sessionIds) {
    const snapshot = await loadTrainingActivitySnapshot({
      tenantId: input.tenantId,
      sessionId,
      locale: input.locale,
    });
    if (snapshot) map.set(sessionId, snapshot);
  }
  return map;
}
