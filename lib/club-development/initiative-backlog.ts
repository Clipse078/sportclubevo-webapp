import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  applyVisibilityFilter,
  buildVisibilityWhere,
  canSeeEntity,
} from "@/lib/visibility/visibility-filter";
import type { InitiativeDisposition, InitiativeStatus, Prisma } from "@prisma/client";

const BACKLOG_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  owner: true,
  ownerPersonId: true,
  progress: true,
  dueDate: true,
  expectedOutcome: true,
  backlogPriority: true,
  disposition: true,
  visibilityScope: true,
  createdByUserId: true,
  visibleRoleRefs: true,
  visibleUserRefs: true,
  visibleTeamRefs: true,
  visibleOrgUnitRefs: true,
  visiblePersonRefs: true,
  visibleTargetGroupRefs: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type InitiativeBacklogFilters = {
  search?: string;
  status?: InitiativeStatus | InitiativeStatus[];
  ownerPersonId?: string;
  disposition?: InitiativeDisposition | InitiativeDisposition[];
};

export function sortInitiativeBacklogRows<
  T extends { backlogPriority: number; updatedAt: Date },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.backlogPriority !== a.backlogPriority) {
      return b.backlogPriority - a.backlogPriority;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export function buildInitiativeBacklogWhere(
  tenantId: string,
  filters: InitiativeBacklogFilters,
): Prisma.InitiativeWhereInput {
  const where: Prisma.InitiativeWhereInput = { tenantId };

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { expectedOutcome: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
  }

  if (filters.ownerPersonId) {
    where.ownerPersonId = filters.ownerPersonId;
  }

  if (filters.disposition) {
    where.disposition = Array.isArray(filters.disposition)
      ? { in: filters.disposition }
      : filters.disposition;
  }

  return where;
}

export async function listInitiativeBacklog(
  actor: ActorContext,
  filters: InitiativeBacklogFilters = {},
) {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some((key) =>
      ["initiatives.view", "initiatives.manage"].includes(key),
    )
  ) {
    return [];
  }

  const rows = await prisma.initiative.findMany({
    where: {
      ...buildInitiativeBacklogWhere(actor.tenantId, filters),
      ...buildVisibilityWhere(actor),
    },
    select: BACKLOG_SELECT,
  });

  const visible = applyVisibilityFilter(rows, actor);
  return sortInitiativeBacklogRows(visible);
}

export async function getInitiativeBacklogItem(actor: ActorContext, initiativeId: string) {
  if (!actor.tenantId) return null;
  const row = await prisma.initiative.findFirst({
    where: { id: initiativeId, tenantId: actor.tenantId },
    select: BACKLOG_SELECT,
  });
  if (!row || !canSeeEntity(row, actor)) return null;
  return row;
}
