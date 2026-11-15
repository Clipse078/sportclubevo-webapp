import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter, buildVisibilityWhere } from "@/lib/visibility/visibility-filter";
import { PERMISSIONS } from "@/lib/permissions/permissions";

export type TargetCandidateRow = {
  id: string;
  title: string;
  status: string;
};

export async function searchTargetCandidates(
  actor: ActorContext,
  query: string,
  limit = 20,
): Promise<TargetCandidateRow[]> {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some(
      (k) => k === PERMISSIONS.TARGETS_VIEW || k === PERMISSIONS.TARGETS_MANAGE,
    )
  ) {
    return [];
  }

  const q = query.trim();
  const take = Math.min(Math.max(limit, 1), 40);

  const rows = await prisma.target.findMany({
    where: {
      tenantId: actor.tenantId,
      ...buildVisibilityWhere(actor),
      ...(q.length >= 2
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: { id: true, title: true, status: true, visibilityScope: true, createdByUserId: true, visibleRoleRefs: true, visibleUserRefs: true, visibleTeamRefs: true, visibleOrgUnitRefs: true, visiblePersonRefs: true, visibleTargetGroupRefs: true },
    orderBy: [{ title: "asc" }],
    take: q.length >= 2 ? take : 0,
  });

  return applyVisibilityFilter(rows, actor).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
  }));
}