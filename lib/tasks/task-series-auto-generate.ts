/**
 * AUFGABEN-03B — scheduled TaskSeries occurrence generation (tenant-safe, idempotent).
 */

import { TaskSeriesStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateTaskOccurrencesInternal } from "./task-series-service";

export type TaskSeriesAutoGenerateSummary = {
  tenantsProcessed: number;
  seriesProcessed: number;
  generatedTaskCount: number;
  failures: Array<{ tenantId: string; seriesId?: string; error: string }>;
};

export async function runAutomaticTaskSeriesOccurrenceGeneration(): Promise<TaskSeriesAutoGenerateSummary> {
  const tenantIds = await prisma.taskSeries.findMany({
    where: { status: TaskSeriesStatus.ACTIVE },
    select: { tenantId: true },
    distinct: ["tenantId"],
  });

  const summary: TaskSeriesAutoGenerateSummary = {
    tenantsProcessed: 0,
    seriesProcessed: 0,
    generatedTaskCount: 0,
    failures: [],
  };

  for (const { tenantId } of tenantIds) {
    summary.tenantsProcessed += 1;

    const activeSeries = await prisma.taskSeries.findMany({
      where: { tenantId, status: TaskSeriesStatus.ACTIVE },
      select: { id: true, createdByUserId: true, assigneeTemplates: { select: { userId: true }, take: 1 } },
    });

    for (const series of activeSeries) {
      summary.seriesProcessed += 1;
      const actorUserId =
        series.createdByUserId ?? series.assigneeTemplates[0]?.userId ?? null;
      if (!actorUserId) {
        summary.failures.push({
          tenantId,
          seriesId: series.id,
          error: "No actor user for occurrence generation",
        });
        continue;
      }

      try {
        const result = await generateTaskOccurrencesInternal(tenantId, actorUserId, series.id);
        summary.generatedTaskCount += result.generatedTaskIds.length;
      } catch (err) {
        summary.failures.push({
          tenantId,
          seriesId: series.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return summary;
}
