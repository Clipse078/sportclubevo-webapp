/**
 * SCE-CD-02R5 — eligible unresolved topics from prior meetings + idempotent apply.
 */

import { MeetingActionStatus, MeetingAgendaItemStatus, TaskContextType, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import { applyVisibilityFilter, buildVisibilityWhere } from "@/lib/visibility/visibility-filter";

export type CarryForwardSourceType = "AGENDA_OPEN" | "TASK_OPEN" | "ACTION_OPEN";

export type CarryForwardEligibleItem = {
  key: string;
  sourceType: CarryForwardSourceType;
  title: string;
  sourceMeetingId: string;
  sourceMeetingTitle: string;
  sourceMeetingDate: string;
  statusLabel: string;
  ownerLabel: string | null;
  sourceAgendaItemId?: string;
  sourceTaskId?: string;
  sourceActionId?: string;
};

const AGENDA_STATUS_LABEL: Record<MeetingAgendaItemStatus, string> = {
  OPEN: "Offen",
  DISCUSSED: "Besprochen",
  SKIPPED: "Übersprungen",
};

export async function listCarryForwardEligibleItems(
  actor: ActorContext,
  targetMeetingId: string,
): Promise<CarryForwardEligibleItem[]> {
  const tenantId = actor.tenantId;
  if (!tenantId) return [];

  const target = await prisma.meeting.findFirst({
    where: { id: targetMeetingId, tenantId },
    select: { id: true },
  });
  if (!target) return [];

  // Scope: permission-visible prior meetings only (max 50). Series/committee narrowing is migration-dependent (Meeting.seriesId).
  const visibleMeetings = await prisma.meeting.findMany({
    where: {
      tenantId,
      id: { not: targetMeetingId },
      ...buildVisibilityWhere(actor),
    },
    select: {
      id: true,
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
    orderBy: { meetingDate: "desc" },
    take: 50,
  });
  const meetings = applyVisibilityFilter(visibleMeetings, actor).map((m) => ({
    id: m.id,
    title: m.title,
    meetingDate: m.meetingDate,
  }));
  const meetingIds = meetings.map((m) => m.id);
  if (meetingIds.length === 0) return [];

  const meetingById = new Map(meetings.map((m) => [m.id, m]));

  const [openAgenda, existingCopies, openTasks, openActions] = await Promise.all([
    prisma.meetingAgendaItem.findMany({
      where: {
        meetingId: { in: meetingIds },
        status: MeetingAgendaItemStatus.OPEN,
      },
      select: {
        id: true,
        title: true,
        status: true,
        owner: true,
        meetingId: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.meetingAgendaItem.findMany({
      where: {
        meetingId: targetMeetingId,
        sourceAgendaItemId: { not: null },
      },
      select: { sourceAgendaItemId: true },
    }),
    prisma.task.findMany({
      where: {
        tenantId,
        contextType: TaskContextType.MEETING,
        contextId: { in: meetingIds },
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        contextId: true,
        assignees: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.meetingAction.findMany({
      where: {
        meetingId: { in: meetingIds },
        status: { in: [MeetingActionStatus.OPEN, MeetingActionStatus.IN_PROGRESS] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        owner: true,
        ownerPersonId: true,
        meetingId: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const alreadyAgendaSources = new Set(
    existingCopies.map((r) => r.sourceAgendaItemId).filter(Boolean) as string[],
  );

  const items: CarryForwardEligibleItem[] = [];

  for (const row of openAgenda) {
    if (alreadyAgendaSources.has(row.id)) continue;
    const meeting = meetingById.get(row.meetingId);
    if (!meeting) continue;
    items.push({
      key: `agenda:${row.id}`,
      sourceType: "AGENDA_OPEN",
      title: row.title,
      sourceMeetingId: meeting.id,
      sourceMeetingTitle: meeting.title,
      sourceMeetingDate: meeting.meetingDate.toISOString(),
      statusLabel: AGENDA_STATUS_LABEL[row.status],
      ownerLabel: row.owner,
      sourceAgendaItemId: row.id,
    });
  }

  const tasksAlreadyOnTarget = await prisma.task.findMany({
    where: {
      tenantId,
      contextType: TaskContextType.MEETING,
      contextId: targetMeetingId,
      status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
    },
    select: { id: true },
  });
  const onTargetIds = new Set(tasksAlreadyOnTarget.map((t) => t.id));

  const ACTION_STATUS_LABEL: Record<MeetingActionStatus, string> = {
    OPEN: "Offen",
    IN_PROGRESS: "In Bearbeitung",
    DONE: "Erledigt",
    CANCELLED: "Abgebrochen",
  };

  for (const action of openActions) {
    const meeting = meetingById.get(action.meetingId);
    if (!meeting) continue;
    items.push({
      key: `action:${action.id}`,
      sourceType: "ACTION_OPEN",
      title: action.title,
      sourceMeetingId: meeting.id,
      sourceMeetingTitle: meeting.title,
      sourceMeetingDate: meeting.meetingDate.toISOString(),
      statusLabel: ACTION_STATUS_LABEL[action.status],
      ownerLabel: action.owner,
      sourceActionId: action.id,
    });
  }

  for (const task of openTasks) {
    if (onTargetIds.has(task.id)) continue;
    const meeting = task.contextId ? meetingById.get(task.contextId) : undefined;
    if (!meeting) continue;
    const assignee = task.assignees[0]?.user;
    const ownerLabel = assignee
      ? `${assignee.firstName} ${assignee.lastName}`.trim()
      : null;
    items.push({
      key: `task:${task.id}`,
      sourceType: "TASK_OPEN",
      title: task.title,
      sourceMeetingId: meeting.id,
      sourceMeetingTitle: meeting.title,
      sourceMeetingDate: meeting.meetingDate.toISOString(),
      statusLabel: task.status === TaskStatus.IN_PROGRESS ? "In Arbeit" : "Offen",
      ownerLabel,
      sourceTaskId: task.id,
    });
  }

  return items;
}

export type CarryForwardSelection = {
  sourceType: CarryForwardSourceType;
  sourceAgendaItemId?: string;
  sourceTaskId?: string;
  sourceActionId?: string;
};

export async function applyCarryForwardSelections(input: {
  actor: ActorContext;
  targetMeetingId: string;
  selections: CarryForwardSelection[];
}): Promise<{ agendaCreated: number; tasksLinked: number; skipped: number }> {
  const tenantId = input.actor.tenantId;
  if (!tenantId) throw new Error("Tenant fehlt.");

  let agendaCreated = 0;
  let tasksLinked = 0;
  let skipped = 0;

  const maxOrder = await prisma.meetingAgendaItem.aggregate({
    where: { meetingId: input.targetMeetingId },
    _max: { orderIndex: true },
  });
  let nextIndex = (maxOrder._max.orderIndex ?? -1) + 1;

  for (const sel of input.selections) {
    if (sel.sourceType === "AGENDA_OPEN" && sel.sourceAgendaItemId) {
      const existing = await prisma.meetingAgendaItem.findFirst({
        where: {
          meetingId: input.targetMeetingId,
          sourceAgendaItemId: sel.sourceAgendaItemId,
        },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const source = await prisma.meetingAgendaItem.findFirst({
        where: { id: sel.sourceAgendaItemId },
        select: {
          id: true,
          title: true,
          notes: true,
          owner: true,
          ownerPersonId: true,
          durationMin: true,
          initiativeId: true,
          status: true,
          meeting: { select: { tenantId: true } },
        },
      });
      if (!source || source.meeting.tenantId !== tenantId || source.status !== MeetingAgendaItemStatus.OPEN) {
        skipped += 1;
        continue;
      }

      await prisma.meetingAgendaItem.create({
        data: {
          meetingId: input.targetMeetingId,
          title: source.title,
          notes: source.notes,
          owner: source.owner,
          ownerPersonId: source.ownerPersonId,
          durationMin: source.durationMin,
          initiativeId: source.initiativeId,
          sourceAgendaItemId: source.id,
          orderIndex: nextIndex++,
          status: MeetingAgendaItemStatus.OPEN,
          createdByUserId: input.actor.userId,
        },
      });
      agendaCreated += 1;
      continue;
    }

    if (sel.sourceType === "TASK_OPEN" && sel.sourceTaskId) {
      const task = await prisma.task.findFirst({
        where: { id: sel.sourceTaskId, tenantId },
        select: { id: true, contextType: true, contextId: true, status: true },
      });
      if (
        !task ||
        task.contextType !== TaskContextType.MEETING ||
        !task.contextId ||
        task.contextId === input.targetMeetingId
      ) {
        skipped += 1;
        continue;
      }
      if (task.status !== TaskStatus.OPEN && task.status !== TaskStatus.IN_PROGRESS) {
        skipped += 1;
        continue;
      }

      await prisma.task.update({
        where: { id: task.id },
        data: {
          contextType: TaskContextType.MEETING,
          contextId: input.targetMeetingId,
        },
      });
      tasksLinked += 1;
      continue;
    }

    if (sel.sourceType === "ACTION_OPEN") {
      // Migration-dependent: durable cross-meeting Massnahme review uses MeetingCommitmentReview (see SCE-MTG-PEND-01-SCHEMA-GAPS).
      skipped += 1;
    }
  }

  return { agendaCreated, tasksLinked, skipped };
}
