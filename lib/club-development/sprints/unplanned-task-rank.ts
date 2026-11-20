import "server-only";

import { prisma } from "@/lib/db/prisma";

export class UnplannedTaskRankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnplannedTaskRankError";
  }
}

const RANK_STEP = 1000;

export async function loadUnplannedTaskRankMap(
  tenantId: string,
  taskIds: string[],
): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await prisma.developmentUnplannedTaskRank.findMany({
    where: { tenantId, taskId: { in: taskIds } },
    select: { taskId: true, rank: true },
  });
  return new Map(rows.map((r) => [r.taskId, r.rank] as const));
}

export function compareTasksByUnplannedRank<T extends { id: string; updatedAt?: Date }>(
  a: T,
  b: T,
  rankMap: Map<string, number>,
): number {
  const ra = rankMap.get(a.id);
  const rb = rankMap.get(b.id);
  if (ra != null && rb != null) return ra - rb;
  if (ra != null) return -1;
  if (rb != null) return 1;
  const ua = a.updatedAt?.getTime() ?? 0;
  const ub = b.updatedAt?.getTime() ?? 0;
  if (ua !== ub) return ub - ua;
  return a.id.localeCompare(b.id);
}

export async function persistUnplannedTaskOrder(
  tenantId: string,
  orderedTaskIds: string[],
  allowedTaskIds: Set<string>,
): Promise<void> {
  const unique = [...new Set(orderedTaskIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== orderedTaskIds.length) {
    throw new UnplannedTaskRankError("Doppelte Aufgaben in der Reihenfolge.");
  }
  if (unique.length !== allowedTaskIds.size) {
    throw new UnplannedTaskRankError(
      "Die Reihenfolge muss alle sichtbaren ungeplanten Aufgaben ohne Filter enthalten.",
    );
  }
  for (const id of unique) {
    if (!allowedTaskIds.has(id)) {
      throw new UnplannedTaskRankError("Eine Aufgabe ist nicht für die Ungeplant-Liste zulässig.");
    }
  }

  await prisma.$transaction(
    unique.map((taskId, index) =>
      prisma.developmentUnplannedTaskRank.upsert({
        where: { tenantId_taskId: { tenantId, taskId } },
        create: { tenantId, taskId, rank: (index + 1) * RANK_STEP },
        update: { rank: (index + 1) * RANK_STEP },
      }),
    ),
  );
}

export async function clearUnplannedTaskRank(tenantId: string, taskId: string): Promise<void> {
  await prisma.developmentUnplannedTaskRank.deleteMany({ where: { tenantId, taskId } });
}