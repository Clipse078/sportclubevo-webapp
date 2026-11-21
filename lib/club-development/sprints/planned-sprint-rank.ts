import "server-only";

import { prisma } from "@/lib/db/prisma";
export { comparePlannedSprintsByRank } from "./planned-sprint-rank-ordering";

export class PlannedSprintRankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlannedSprintRankError";
  }
}

const RANK_STEP = 1000;

export async function loadPlannedSprintRankMap(
  tenantId: string,
  sprintIds: string[],
): Promise<Map<string, number>> {
  if (sprintIds.length === 0) return new Map();
  const rows = await prisma.developmentPlannedSprintRank.findMany({
    where: { tenantId, sprintId: { in: sprintIds } },
    select: { sprintId: true, rank: true },
  });
  return new Map(rows.map((r) => [r.sprintId, r.rank] as const));
}

export async function persistPlannedSprintOrder(
  tenantId: string,
  orderedSprintIds: string[],
  allowedPlannedSprintIds: Set<string>,
): Promise<void> {
  const unique = [...new Set(orderedSprintIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length !== orderedSprintIds.length) {
    throw new PlannedSprintRankError("Doppelte Umsetzungsphasen in der Reihenfolge.");
  }
  if (unique.length !== allowedPlannedSprintIds.size) {
    throw new PlannedSprintRankError(
      "Die Reihenfolge muss alle sichtbaren geplanten Umsetzungsphasen ohne Filter enthalten.",
    );
  }
  for (const id of unique) {
    if (!allowedPlannedSprintIds.has(id)) {
      throw new PlannedSprintRankError("Eine Umsetzungsphase ist nicht für die Geplant-Liste zulässig.");
    }
  }

  await prisma.$transaction(
    unique.map((sprintId, index) =>
      prisma.developmentPlannedSprintRank.upsert({
        where: { tenantId_sprintId: { tenantId, sprintId } },
        create: { tenantId, sprintId, rank: (index + 1) * RANK_STEP },
        update: { rank: (index + 1) * RANK_STEP },
      }),
    ),
  );
}