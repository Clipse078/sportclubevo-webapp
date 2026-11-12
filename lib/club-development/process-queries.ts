/**
 * Club development process queries — server-only, visibility-filtered.
 */

import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  applyVisibilityFilter,
  buildVisibilityWhere,
  canSeeEntity,
  type VisibilityCheckable,
} from "@/lib/visibility/visibility-filter";

function asVisibilityCheckable<T extends Omit<VisibilityCheckable, "visibleTeamRefs" | "visiblePersonRefs">>(
  row: T,
): VisibilityCheckable & T {
  return {
    ...row,
    visibleTeamRefs: null,
    visiblePersonRefs: null,
  };
}

const PROCESS_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  owner: true,
  ownerPersonId: true,
  approvalRequired: true,
  approvalRule: true,
  approverPersonIds: true,
  approvalStatus: true,
  documentRevision: true,
  approvalContentRevision: true,
  visibilityScope: true,
  createdByUserId: true,
  visibleRoleRefs: true,
  visibleUserRefs: true,
  visibleOrgUnitRefs: true,
  visibleTargetGroupRefs: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PROCESS_DETAIL_SELECT = {
  ...PROCESS_LIST_SELECT,
  description: true,
  approvedContentHash: true,
} as const;

export async function getClubDevelopmentProcesses(actor: ActorContext) {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some((key) => ["initiatives.view", "initiatives.manage"].includes(key))
  ) {
    return [];
  }
  const rows = await prisma.clubDevelopmentProcess.findMany({
    where: { tenantId: actor.tenantId, ...buildVisibilityWhere(actor) },
    orderBy: { updatedAt: "desc" },
    select: PROCESS_LIST_SELECT,
  });
  return applyVisibilityFilter(rows.map(asVisibilityCheckable), actor);
}

export async function getClubDevelopmentProcessBySlug(slug: string, actor: ActorContext) {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some((key) => ["initiatives.view", "initiatives.manage"].includes(key))
  ) {
    return null;
  }
  const row = await prisma.clubDevelopmentProcess.findFirst({
    where: { slug, tenantId: actor.tenantId },
    select: PROCESS_DETAIL_SELECT,
  });
  if (!row || !canSeeEntity(asVisibilityCheckable(row), actor)) return null;
  return row;
}

export async function getClubDevelopmentProcessById(id: string, actor: ActorContext) {
  if (
    !actor.tenantId ||
    !actor.permissionKeys.some((key) => ["initiatives.view", "initiatives.manage"].includes(key))
  ) {
    return null;
  }
  const row = await prisma.clubDevelopmentProcess.findFirst({
    where: { id, tenantId: actor.tenantId },
    select: PROCESS_DETAIL_SELECT,
  });
  if (!row || !canSeeEntity(asVisibilityCheckable(row), actor)) return null;
  return row;
}

export async function getProcessApprovalVotes(processId: string, tenantId: string) {
  return prisma.clubDevelopmentProcessApprovalVote.findMany({
    where: { processId, tenantId },
    orderBy: { decidedAt: "asc" },
    select: {
      id: true,
      approverPersonId: true,
      decision: true,
      comment: true,
      decidedAt: true,
    },
  });
}
