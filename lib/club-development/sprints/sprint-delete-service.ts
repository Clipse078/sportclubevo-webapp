import "server-only";

import { prisma } from "@/lib/db/prisma";
import { CD_SPRINT_API_COPY } from "@/lib/club-development/product-copy";

export type SprintDeletionImpact = {
  /** Active sprint-task memberships removed with the phase (tasks themselves stay). */
  activeMembershipCount: number;
  /** Tasks remain in the tenant after phase deletion. */
  tasksPreserved: true;
};

export type SprintDeletionResult = {
  sprintId: string;
  title: string;
  impact: SprintDeletionImpact;
};

export async function getDevelopmentSprintDeletionImpact(
  sprintId: string,
  tenantId: string,
): Promise<SprintDeletionImpact | null> {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { id: true },
  });
  if (!sprint) return null;

  const activeMembershipCount = await prisma.developmentSprintTaskMembership.count({
    where: { tenantId, sprintId, removedAt: null },
  });

  return {
    activeMembershipCount,
    tasksPreserved: true,
  };
}

/**
 * Permanently deletes an Umsetzungsphase. Task rows and subtasks are never deleted —
 * only sprint membership rows cascade via Prisma.
 */
export async function deleteDevelopmentSprintPermanently(
  sprintId: string,
  tenantId: string,
): Promise<SprintDeletionResult | null> {
  const sprint = await prisma.developmentSprint.findFirst({
    where: { id: sprintId, tenantId },
    select: { title: true },
  });
  if (!sprint) return null;

  const impact = await getDevelopmentSprintDeletionImpact(sprintId, tenantId);
  if (!impact) {
    throw new Error(CD_SPRINT_API_COPY.phaseNotFound);
  }

  await prisma.developmentSprint.delete({
    where: { id: sprintId, tenantId },
  });

  return {
    sprintId,
    title: sprint.title,
    impact,
  };
}