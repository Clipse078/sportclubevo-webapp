import "server-only";

import { TaskContextType, TaskStatus, InitiativeMilestoneStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getInitiativeById } from "@/lib/initiatives/queries";
import { listInitiativeTargetLinks } from "@/lib/club-development/initiative-target-links";
import { initiativeTaskAssociationOrFilters } from "@/lib/club-development/initiative-associated-tasks";
import { buildTaskReadWhere } from "@/lib/tasks/visibility";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { TASK_STATUS_LABELS } from "@/lib/tasks/management-labels";
import { taskWorkspaceHref } from "@/lib/tasks/task-navigation";
import type { VorhabenWorkspacePanelSnapshot } from "./vorhaben-workspace-card-types";

const MILESTONE_STATUS_LABELS: Record<InitiativeMilestoneStatus, string> = {
  OPEN: "Offen",
  DONE: "Erledigt",
};

async function meetingDecisionIdsForInitiative(tenantId: string, initiativeId: string) {
  const agendaItemIds = await prisma.meetingAgendaItem.findMany({
    where: { initiativeId, meeting: { tenantId } },
    select: { id: true },
  });
  const agendaIds = agendaItemIds.map((row) => row.id);
  if (agendaIds.length === 0) return [];
  const decisions = await prisma.meetingDecision.findMany({
    where: {
      sourceAgendaItemId: { in: agendaIds },
      meeting: { tenantId },
    },
    select: { id: true },
  });
  return decisions.map((row) => row.id);
}

export async function loadVorhabenWorkspacePanel(
  actor: ActorContext,
  initiativeId: string,
  options?: { returnTo?: string },
): Promise<VorhabenWorkspacePanelSnapshot | null> {
  if (!actor.tenantId) return null;

  const initiative = await getInitiativeById(initiativeId, actor);
  if (!initiative) return null;

  const canManageInitiatives = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);
  const canViewTasks =
    actor.permissionKeys.includes(PERMISSIONS.TASKS_VIEW) ||
    actor.permissionKeys.includes(PERMISSIONS.TASKS_MANAGE);
  const canManageTasks = actor.permissionKeys.includes(PERMISSIONS.TASKS_MANAGE);

  const returnTo = options?.returnTo?.trim() || "/vereinsleitung/vorhaben-und-umsetzung";

  const [targetLinkRows, milestones] = await Promise.all([
    listInitiativeTargetLinks(actor.tenantId, initiativeId),
    prisma.initiativeMilestone.findMany({
      where: { tenantId: actor.tenantId, initiativeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, status: true, targetDate: true },
    }),
  ]);

  let rootTasks: VorhabenWorkspacePanelSnapshot["rootTasks"] = [];
  if (canViewTasks) {
    const taskCtx = await getTaskServiceContext();
    if (taskCtx) {
      const decisionIds = await meetingDecisionIdsForInitiative(actor.tenantId, initiativeId);
      const orFilters = [
        ...initiativeTaskAssociationOrFilters(initiativeId),
        ...(decisionIds.length > 0
          ? [{ contextType: TaskContextType.MEETING_DECISION, contextId: { in: decisionIds } }]
          : []),
      ];

      const taskRows = await prisma.task.findMany({
        where: {
          tenantId: actor.tenantId,
          parentTaskId: null,
          status: { not: TaskStatus.CANCELLED },
          AND: [buildTaskReadWhere(taskCtx)],
          OR: orFilters,
        },
        select: { id: true, title: true, status: true },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
        take: 40,
      });

      rootTasks = taskRows.map((row) => ({
        id: row.id,
        title: row.title,
        statusLabel: TASK_STATUS_LABELS[row.status],
        href: taskWorkspaceHref(row.id, { returnTo }),
      }));
    }
  }

  return {
    initiativeId,
    reviewStage: initiative.reviewStage ?? null,
    canManageInitiatives,
    canManageTasks,
    canViewTasks,
    editHref: `/vereinsleitung/initiativen/${encodeURIComponent(initiative.slug)}/edit`,
    targetLinks: targetLinkRows.map((link) => ({
      targetId: link.target.id,
      title: link.target.title,
      href: `/vereinsleitung/targets/${encodeURIComponent(link.target.id)}`,
    })),
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      statusLabel: MILESTONE_STATUS_LABELS[m.status],
      targetDate: m.targetDate?.toISOString() ?? null,
    })),
    rootTasks,
  };
}