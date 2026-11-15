import type { PrismaClient } from "@prisma/client";
import type { NormalizedTargetMetric } from "@/lib/targets/target-metric-payload";

type DbClient = Pick<PrismaClient, "targetMetric">;

/**
 * Replaces the target's metric set with the normalized payload (update by id, create new, delete removed).
 */
export async function syncTargetMetricsForTarget(
  db: DbClient,
  targetId: string,
  metrics: NormalizedTargetMetric[],
): Promise<void> {
  const existing = await db.targetMetric.findMany({
    where: { targetId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((m) => m.id));
  const retainedIds = new Set<string>();

  for (const metric of metrics) {
    if (metric.id && existingIds.has(metric.id)) {
      await db.targetMetric.update({
        where: { id: metric.id },
        data: {
          label: metric.label,
          type: metric.type,
          direction: metric.direction,
          targetValue: metric.targetValue,
          currentValue: metric.currentValue,
          unit: metric.unit,
          notes: metric.notes,
          sortOrder: metric.sortOrder,
        },
      });
      retainedIds.add(metric.id);
      continue;
    }

    const created = await db.targetMetric.create({
      data: {
        targetId,
        label: metric.label,
        type: metric.type,
        direction: metric.direction,
        targetValue: metric.targetValue,
        currentValue: metric.currentValue,
        unit: metric.unit,
        notes: metric.notes,
        sortOrder: metric.sortOrder,
      },
      select: { id: true },
    });
    retainedIds.add(created.id);
  }

  const toDelete = [...existingIds].filter((id) => !retainedIds.has(id));
  if (toDelete.length > 0) {
    await db.targetMetric.deleteMany({
      where: { id: { in: toDelete }, targetId },
    });
  }
}