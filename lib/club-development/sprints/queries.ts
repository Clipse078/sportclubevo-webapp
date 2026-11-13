import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  applyVisibilityFilter,
  buildVisibilityWhere,
  canSeeEntity,
  type VisibilityCheckable,
} from "@/lib/visibility/visibility-filter";

function asSprintVisibility<T extends Omit<VisibilityCheckable, "visibleTeamRefs" | "visiblePersonRefs">>(
  row: T,
): VisibilityCheckable & T {
  return { ...row, visibleTeamRefs: null, visiblePersonRefs: null };
}

const SPRINT_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  goal: true,
  status: true,
  owner: true,
  ownerPersonId: true,
  startsAt: true,
  endsAt: true,
  completedAt: true,
  visibilityScope: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SPRINT_DETAIL_SELECT = {
  ...SPRINT_LIST_SELECT,
} as const;

function hasSprintReadPermission(actor: ActorContext): boolean {
  return actor.permissionKeys.some((key) =>
    ["initiatives.view", "initiatives.manage", "tasks.manage"].includes(key),
  );
}

export function hasSprintManagePermission(actor: ActorContext): boolean {
  return actor.permissionKeys.some((key) =>
    ["initiatives.manage", "tasks.manage"].includes(key),
  );
}

export async function listDevelopmentSprints(actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return [];
  const rows = await prisma.developmentSprint.findMany({
    where: { tenantId: actor.tenantId, ...buildVisibilityWhere(actor) },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: SPRINT_LIST_SELECT,
  });
  return applyVisibilityFilter(rows.map(asSprintVisibility), actor);
}

export async function getDevelopmentSprintById(id: string, actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return null;
  const row = await prisma.developmentSprint.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: SPRINT_DETAIL_SELECT,
  });
  if (!row || !canSeeEntity(asSprintVisibility(row), actor)) return null;
  return row;
}

export async function getDevelopmentSprintBySlug(slug: string, actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return null;
  const row = await prisma.developmentSprint.findFirst({
    where: { slug, tenantId: actor.tenantId },
    select: SPRINT_DETAIL_SELECT,
  });
  if (!row || !canSeeEntity(asSprintVisibility(row), actor)) return null;
  return row;
}
