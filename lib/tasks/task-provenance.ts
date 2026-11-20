import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { canSeeEntity } from "@/lib/visibility/visibility-filter";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import type { TaskServiceContext } from "./types";

export type TaskProvenanceLink = {
  kind: "meeting" | "agenda" | "decision" | "initiative" | "target";
  label: string;
  href: string | null;
  restricted: boolean;
};

export type TaskProvenance = {
  links: TaskProvenanceLink[];
};

async function hydrateMeetingActor(ctx: TaskServiceContext) {
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(ctx.userId, ctx.tenantId),
    loadTargetGroupIds(ctx.userId, ctx.tenantId),
  ]);
  return buildActorContext(
    { id: ctx.userId, roleKeys: [], permissionKeys: [...ctx.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    ctx.tenantId,
  );
}

export async function resolveTaskProvenance(
  ctx: TaskServiceContext,
  contextType: TaskContextType | null,
  contextId: string | null,
  options?: { seriesOccurrenceKey?: string | null },
): Promise<TaskProvenance | null> {
  if (!contextType || !contextId) {
    return null;
  }

  const links: TaskProvenanceLink[] = [];

  if (contextType === TaskContextType.MEETING_DECISION) {
    const decision = await prisma.meetingDecision.findFirst({
      where: { id: contextId, meeting: { tenantId: ctx.tenantId } },
      select: {
        id: true,
        title: true,
        sourceAgendaItemId: true,
        sourceAgendaItem: {
          select: {
            id: true,
            title: true,
            orderIndex: true,
            initiativeId: true,
            initiative: { select: { id: true, slug: true, title: true, visibilityScope: true, createdByUserId: true, visibleRoleRefs: true, visibleUserRefs: true, visibleTeamRefs: true, visibleOrgUnitRefs: true, visiblePersonRefs: true, visibleTargetGroupRefs: true } },
          },
        },
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
    });
    if (!decision) {
      return { links: [] };
    }

    const actor = await hydrateMeetingActor(ctx);
    const meetingVisible = canSeeMeeting(decision.meeting, actor);

    links.push({
      kind: "decision",
      label: decision.title,
      href: meetingVisible
        ? `/vereinsleitung/meetings/${encodeURIComponent(decision.meeting.slug)}`
        : null,
      restricted: !meetingVisible,
    });

    if (meetingVisible) {
      links.unshift({
        kind: "meeting",
        label: decision.meeting.title,
        href: `/vereinsleitung/meetings/${encodeURIComponent(decision.meeting.slug)}`,
        restricted: false,
      });
    } else {
      links.unshift({
        kind: "meeting",
        label: "Sitzung",
        href: null,
        restricted: true,
      });
    }

    if (decision.sourceAgendaItem) {
      const { buildMeetingTraktandumDeepLink } = await import("@/lib/meetings/meeting-traktandum-navigation");
      const agendaLabel = `Traktandum ${decision.sourceAgendaItem.orderIndex + 1}: ${decision.sourceAgendaItem.title}`;
      links.splice(1, 0, {
        kind: "agenda",
        label: agendaLabel,
        href: meetingVisible
          ? buildMeetingTraktandumDeepLink(decision.meeting.slug, decision.sourceAgendaItem.id)
          : null,
        restricted: !meetingVisible,
      });

      const initiative = decision.sourceAgendaItem.initiative;
      if (initiative) {
        const initiativeVisible = canSeeEntity(initiative, actor);
        links.push({
          kind: "initiative",
          label: initiativeVisible ? initiative.title : "Vorhaben",
          href: initiativeVisible
            ? `/vereinsleitung/initiativen/${encodeURIComponent(initiative.slug)}`
            : null,
          restricted: !initiativeVisible,
        });
      }
    }

    return { links };
  }

  if (contextType === TaskContextType.INITIATIVE) {
    const initiative = await prisma.initiative.findFirst({
      where: { id: contextId, tenantId: ctx.tenantId },
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
    if (!initiative) {
      return { links: [] };
    }
    const actor = await hydrateMeetingActor(ctx);
    const visible = canSeeEntity(initiative, actor);
    links.push({
      kind: "initiative",
      label: visible ? initiative.title : "Vorhaben",
      href: visible ? `/vereinsleitung/initiativen/${encodeURIComponent(initiative.slug)}` : null,
      restricted: !visible,
    });
    return { links };
  }

  if (contextType === TaskContextType.MEETING) {
    const meeting = await prisma.meeting.findFirst({
      where: { id: contextId, tenantId: ctx.tenantId },
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
    });
    if (!meeting) return { links: [] };
    const actor = await hydrateMeetingActor(ctx);
    const visible = canSeeMeeting(meeting, actor);
    const { parseAgendaItemIdFromTraktandumTaskOccurrenceKey } = await import(
      "@/lib/meetings/meeting-traktandum-task-link"
    );
    const { buildMeetingTraktandumDeepLink } = await import("@/lib/meetings/meeting-traktandum-navigation");
    const agendaItemId = options?.seriesOccurrenceKey
      ? parseAgendaItemIdFromTraktandumTaskOccurrenceKey(options.seriesOccurrenceKey)
      : null;

    links.push({
      kind: "meeting",
      label: visible ? meeting.title : "Sitzung",
      href: visible ? `/vereinsleitung/meetings/${encodeURIComponent(meeting.slug)}` : null,
      restricted: !visible,
    });

    if (agendaItemId && visible) {
      const agenda = await prisma.meetingAgendaItem.findFirst({
        where: { id: agendaItemId, meetingId: meeting.id, meeting: { tenantId: ctx.tenantId } },
        select: { id: true, title: true, orderIndex: true },
      });
      if (agenda) {
        links.push({
          kind: "agenda",
          label: `Traktandum ${agenda.orderIndex + 1}: ${agenda.title}`,
          href: buildMeetingTraktandumDeepLink(meeting.slug, agenda.id),
          restricted: false,
        });
      }
    }

    return { links };
  }

  if (contextType === TaskContextType.TARGET) {
    const target = await prisma.target.findFirst({
      where: { id: contextId, tenantId: ctx.tenantId },
      select: {
        id: true,
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
    if (!target) return { links: [] };
    const actor = await hydrateMeetingActor(ctx);
    const visible = canSeeEntity(target, actor);
    links.push({
      kind: "target",
      label: visible ? target.title : "Ziel",
      href: visible ? `/vereinsleitung/targets/${encodeURIComponent(target.id)}` : null,
      restricted: !visible,
    });

    const focus = await prisma.clubStrategyFocusTarget.findFirst({
      where: { targetId: target.id, tenantId: ctx.tenantId },
      select: {
        clubStrategy: { select: { id: true, title: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
    const strategyTitle = focus?.clubStrategy.title?.trim();
    if (strategyTitle) {
      const { buildStrategieReturnHref } = await import(
        "@/lib/club-development/vereinsentwicklung-create-routing"
      );
      links.push({
        kind: "target",
        label: `Strategie · ${strategyTitle}`,
        href: buildStrategieReturnHref({ strategyId: focus!.clubStrategy.id }),
        restricted: false,
      });
    }

    return { links };
  }

  return null;
}
