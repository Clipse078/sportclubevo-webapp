import "server-only";

import { InitiativeMilestoneStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { VorhabenWorkspaceCardNextMilestone } from "./vorhaben-workspace-card-types";

export async function loadNextOpenMilestoneByInitiativeIds(
  tenantId: string,
  initiativeIds: readonly string[],
): Promise<Map<string, VorhabenWorkspaceCardNextMilestone>> {
  if (initiativeIds.length === 0) return new Map();

  const milestones = await prisma.initiativeMilestone.findMany({
    where: {
      tenantId,
      initiativeId: { in: [...initiativeIds] },
      status: InitiativeMilestoneStatus.OPEN,
    },
    orderBy: [{ initiativeId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { initiativeId: true, title: true, targetDate: true },
  });

  const map = new Map<string, VorhabenWorkspaceCardNextMilestone>();
  for (const row of milestones) {
    if (map.has(row.initiativeId)) continue;
    map.set(row.initiativeId, {
      title: row.title,
      targetDate: row.targetDate?.toISOString() ?? null,
    });
  }
  return map;
}