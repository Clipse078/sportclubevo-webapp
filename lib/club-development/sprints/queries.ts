import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";

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

export type DevelopmentSprintListItem = Awaited<
  ReturnType<typeof listDevelopmentSprints>
>[number];

export async function listDevelopmentSprints(actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return [];
  return prisma.developmentSprint.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: SPRINT_LIST_SELECT,
  });
}

export async function getDevelopmentSprintById(id: string, actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return null;
  return prisma.developmentSprint.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: SPRINT_DETAIL_SELECT,
  });
}

export async function getDevelopmentSprintBySlug(slug: string, actor: ActorContext) {
  if (!actor.tenantId || !hasSprintReadPermission(actor)) return null;
  return prisma.developmentSprint.findFirst({
    where: { slug, tenantId: actor.tenantId },
    select: SPRINT_DETAIL_SELECT,
  });
}
