import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TaskServiceContext } from "./types";

export type TaskWorkspaceSprintLink = {
  sprintId: string;
  slug: string;
  title: string;
  href: string;
  removedAt: string | null;
};

export type TaskWorkspacePrimaryInitiativeLink = {
  initiativeId: string;
  slug: string;
  title: string;
  href: string;
};

export type TaskWorkspaceAssociations = {
  primaryInitiative: TaskWorkspacePrimaryInitiativeLink | null;
  currentSprints: TaskWorkspaceSprintLink[];
  sprintHistory: TaskWorkspaceSprintLink[];
};

function sprintHref(slug: string): string {
  return `/vereinsleitung/sprints/${encodeURIComponent(slug)}`;
}

function initiativeHref(slug: string): string {
  return `/vereinsleitung/initiativen/${encodeURIComponent(slug)}`;
}

export async function loadTaskWorkspaceAssociations(
  ctx: TaskServiceContext,
  taskId: string,
  primaryInitiativeId: string | null,
  contextType: TaskContextType | null,
  contextId: string | null,
): Promise<TaskWorkspaceAssociations> {
  const [memberships, initiativeRow] = await Promise.all([
    prisma.developmentSprintTaskMembership.findMany({
      where: { tenantId: ctx.tenantId, taskId },
      include: {
        sprint: { select: { id: true, slug: true, title: true } },
      },
      orderBy: { addedAt: "desc" },
    }),
    primaryInitiativeId
      ? prisma.initiative.findFirst({
          where: { id: primaryInitiativeId, tenantId: ctx.tenantId },
          select: { id: true, slug: true, title: true },
        })
      : Promise.resolve(null),
  ]);

  const sprintLinks: TaskWorkspaceSprintLink[] = memberships.map((row) => ({
    sprintId: row.sprintId,
    slug: row.sprint.slug,
    title: row.sprint.title,
    href: sprintHref(row.sprint.slug),
    removedAt: row.removedAt?.toISOString() ?? null,
  }));

  const currentSprints = sprintLinks.filter((link) => !link.removedAt);
  const sprintHistory = sprintLinks.filter((link) => Boolean(link.removedAt));

  const contextIsSameInitiative =
    contextType === TaskContextType.INITIATIVE &&
    contextId != null &&
    initiativeRow?.id === contextId;

  const primaryInitiative =
    initiativeRow && !contextIsSameInitiative
      ? {
          initiativeId: initiativeRow.id,
          slug: initiativeRow.slug,
          title: initiativeRow.title,
          href: initiativeHref(initiativeRow.slug),
        }
      : null;

  return {
    primaryInitiative,
    currentSprints,
    sprintHistory,
  };
}