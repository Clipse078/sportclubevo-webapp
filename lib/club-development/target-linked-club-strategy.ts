import "server-only";

import { ClubStrategyScopeType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveStrategyTitle } from "./club-strategy-service";

export type TargetLinkedClubStrategy = {
  id: string;
  title: string;
};

export async function loadTargetLinkedClubStrategy(
  tenantId: string,
  targetId: string,
): Promise<TargetLinkedClubStrategy | null> {
  const link = await prisma.clubStrategyFocusTarget.findFirst({
    where: { tenantId, targetId },
    orderBy: { createdAt: "asc" },
    select: {
      clubStrategy: {
        select: {
          id: true,
          title: true,
          scopeType: true,
          scopeOrgUnitId: true,
          orgUnitAssignments: {
            select: {
              orgUnit: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!link) return null;

  const strategy = link.clubStrategy;
  const orgUnitLabels = strategy.orgUnitAssignments
    .map((row) => row.orgUnit.name)
    .filter((name) => name.trim().length > 0);
  const title = resolveStrategyTitle(strategy.title, strategy.scopeType, orgUnitLabels);
  return { id: strategy.id, title };
}