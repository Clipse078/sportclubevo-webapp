import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { listTasksForContext } from "@/lib/tasks/list-tasks-for-context";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const AGENDA_STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  DISCUSSED: "Besprochen",
  SKIPPED: "Übersprungen",
};

export type InitiativeAgendaLinkRow = {
  agendaItemId: string;
  agendaTitle: string;
  agendaStatus: string;
  agendaStatusLabel: string;
  meetingId: string;
  meetingSlug: string;
  meetingTitle: string;
  meetingDate: string;
  meetingHref: string;
};

export type InitiativeDecisionRow = {
  decisionId: string;
  title: string;
  status: string;
  approvalStatus: string;
  meetingSlug: string;
  meetingTitle: string;
  agendaItemId: string | null;
  agendaTitle: string | null;
  meetingHref: string;
};

export type InitiativeTaskRow = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  assigneeLabel: string | null;
  href: string;
  source: "INITIATIVE" | "MEETING_DECISION";
};

export type InitiativeConnectedWork = {
  agendaLinks: InitiativeAgendaLinkRow[];
  decisions: InitiativeDecisionRow[];
  tasks: InitiativeTaskRow[];
};

function canSeeInitiativeModule(actor: ActorContext): boolean {
  return actor.permissionKeys.some(
    (k) => k === PERMISSIONS.INITIATIVES_VIEW || k === PERMISSIONS.INITIATIVES_MANAGE,
  );
}

export async function loadInitiativeConnectedWork(
  actor: ActorContext,
  initiativeId: string,
): Promise<InitiativeConnectedWork | null> {
  if (!actor.tenantId || !canSeeInitiativeModule(actor)) {
    return null;
  }

  const initiative = await prisma.initiative.findFirst({
    where: { id: initiativeId, tenantId: actor.tenantId },
    select: {
      id: true,
      slug: true,
      title: true,
      visibilityScope: true,
      createdByUserId: true,
      visibleRoleRefs: true,
      visibleUserRefs: true,
      visibleTeamRefs: true,
      visibleOrgUnitRefs: true,
      visiblePersonRefs: true,
      visibleTargetGroupRefs: true,
    },
  });
  if (!initiative || !canSeeEntity(initiative, actor)) {
    return null;
  }

  const agendaItems = await prisma.meetingAgendaItem.findMany({
    where: {
      initiativeId,
      meeting: { tenantId: actor.tenantId },
    },
    select: {
      id: true,
      title: true,
      status: true,
      meeting: {
        select: {
          id: true,
          slug: true,
          title: true,
          meetingDate: true,
          visibilityScope: true,
          createdByUserId: true,
          visibleRoleRefs: true,
          visibleUserRefs: true,
          visibleTeamRefs: true,
          visibleOrgUnitRefs: true,
          visiblePersonRefs: true,
          visibleTargetGroupRefs: true,
        },
      },
    },
    orderBy: { meeting: { meetingDate: "desc" } },
  });

  const visibleAgenda = agendaItems.filter((row) => canSeeMeeting(row.meeting, actor));
  const agendaIds = new Set(visibleAgenda.map((a) => a.id));

  const agendaLinks: InitiativeAgendaLinkRow[] = visibleAgenda.map((row) => ({
    agendaItemId: row.id,
    agendaTitle: row.title,
    agendaStatus: row.status,
    agendaStatusLabel: AGENDA_STATUS_LABELS[row.status] ?? row.status,
    meetingId: row.meeting.id,
    meetingSlug: row.meeting.slug,
    meetingTitle: row.meeting.title,
    meetingDate: row.meeting.meetingDate.toISOString(),
    meetingHref: `/vereinsleitung/meetings/${encodeURIComponent(row.meeting.slug)}`,
  }));

  const decisionsRaw = await prisma.meetingDecision.findMany({
    where: {
      meeting: { tenantId: actor.tenantId },
      OR: [
        { sourceAgendaItemId: { in: [...agendaIds] } },
      ],
    },
    select: {
      id: true,
      title: true,
      status: true,
      approvalStatus: true,
      sourceAgendaItemId: true,
      sourceAgendaItem: { select: { id: true, title: true } },
      meeting: {
        select: {
          slug: true,
          title: true,
          visibilityScope: true,
          createdByUserId: true,
          visibleRoleRefs: true,
          visibleUserRefs: true,
          visibleTeamRefs: true,
          visibleOrgUnitRefs: true,
          visiblePersonRefs: true,
          visibleTargetGroupRefs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const decisions: InitiativeDecisionRow[] = decisionsRaw
    .filter((d) => canSeeMeeting(d.meeting, actor))
    .filter((d) => !d.sourceAgendaItemId || agendaIds.has(d.sourceAgendaItemId))
    .map((d) => ({
      decisionId: d.id,
      title: d.title,
      status: d.status,
      approvalStatus: d.approvalStatus,
      meetingSlug: d.meeting.slug,
      meetingTitle: d.meeting.title,
      agendaItemId: d.sourceAgendaItemId,
      agendaTitle: d.sourceAgendaItem?.title ?? null,
      meetingHref: `/vereinsleitung/meetings/${encodeURIComponent(d.meeting.slug)}`,
    }));

  const taskCtx = await getTaskServiceContext();
  const taskMap = new Map<string, InitiativeTaskRow>();

  if (taskCtx) {
    try {
      const direct = await listTasksForContext(
        taskCtx,
        TaskContextType.INITIATIVE,
        initiativeId,
        { limit: 50 },
      );
      for (const t of direct.tasks) {
        const assignee = t.assignees[0];
        taskMap.set(t.id, {
          id: t.id,
          title: t.title,
          status: t.status,
          dueAt: t.dueAt,
          assigneeLabel: assignee
            ? `${assignee.firstName} ${assignee.lastName}`.trim()
            : null,
          href: `/dashboard/aufgaben/${encodeURIComponent(t.id)}`,
          source: "INITIATIVE",
        });
      }
    } catch {
      // tasks visibility gate
    }

    for (const d of decisions) {
      try {
        const related = await listTasksForContext(
          taskCtx,
          TaskContextType.MEETING_DECISION,
          d.decisionId,
          { limit: 50 },
        );
        for (const t of related.tasks) {
          if (taskMap.has(t.id)) continue;
          const assignee = t.assignees[0];
          taskMap.set(t.id, {
            id: t.id,
            title: t.title,
            status: t.status,
            dueAt: t.dueAt,
            assigneeLabel: assignee
              ? `${assignee.firstName} ${assignee.lastName}`.trim()
              : null,
            href: `/dashboard/aufgaben/${encodeURIComponent(t.id)}`,
            source: "MEETING_DECISION",
          });
        }
      } catch {
        // decision context may be unreadable
      }
    }
  }

  return {
    agendaLinks,
    decisions,
    tasks: [...taskMap.values()],
  };
}
