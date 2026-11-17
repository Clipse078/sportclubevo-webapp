import "server-only";

import type { ActorContext } from "@/lib/visibility/actor-context";
import { canSeeMeeting } from "@/lib/meetings/queries";
import { buildActorContext } from "@/lib/visibility/actor-context";
import { loadOrgUnitIds, loadTargetGroupIds } from "@/lib/org/queries";
import { prisma } from "@/lib/db/prisma";
import { parseMeetingLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";
import { buildMeetingTraktandumDeepLink } from "@/lib/meetings/meeting-traktandum-navigation";
import { buildCanonicalAgendaDisplayOrderMap } from "@/lib/meetings/agenda-display-order";
import type { MeetingOutcomeOrigin, MeetingOutcomeOriginLink } from "@/lib/meetings/meeting-outcome-origin-types";

async function hydrateMeetingActor(actor: ActorContext) {
  if (!actor.tenantId || !actor.userId) {
    return actor;
  }
  const [orgUnitIds, targetGroupIds] = await Promise.all([
    loadOrgUnitIds(actor.userId, actor.tenantId),
    loadTargetGroupIds(actor.userId, actor.tenantId),
  ]);
  return buildActorContext(
    { id: actor.userId, roleKeys: [], permissionKeys: [...actor.permissionKeys] },
    orgUnitIds,
    targetGroupIds,
    actor.tenantId,
  );
}

export async function resolveMeetingActionOrigin(
  actor: ActorContext,
  meeting: {
    id: string;
    slug: string;
    title: string;
    visibilityScope: string;
    createdByUserId: string | null;
    visibleRoleRefs: unknown;
    visibleUserRefs: unknown;
    visibleTeamRefs: unknown;
    visibleOrgUnitRefs: unknown;
    visiblePersonRefs: unknown;
    visibleTargetGroupRefs: unknown;
  },
  linkedRefs: unknown,
  agendaItems: Array<{ id: string; orderIndex: number }> = [],
): Promise<MeetingOutcomeOrigin | null> {
  const refs = parseMeetingLinkedRefs(linkedRefs);
  if (!refs.agendaItemId && !refs.decisionId) {
    return null;
  }

  const hydrated = await hydrateMeetingActor(actor);
  const meetingVisible = canSeeMeeting(meeting, hydrated);
  const links: MeetingOutcomeOriginLink[] = [];

  links.push({
    label: meetingVisible ? meeting.title : "Sitzung",
    href: meetingVisible ? `/vereinsleitung/meetings/${encodeURIComponent(meeting.slug)}` : null,
    restricted: !meetingVisible,
  });

  if (!meetingVisible) {
    return { links };
  }

  let agendaItem: { id: string; title: string; orderIndex: number } | null = null;
  if (refs.agendaItemId) {
    agendaItem = await prisma.meetingAgendaItem.findFirst({
      where: {
        id: refs.agendaItemId,
        meetingId: meeting.id,
        meeting: { tenantId: actor.tenantId ?? undefined },
      },
      select: { id: true, title: true, orderIndex: true },
    });
  }

  const displayOrder =
    agendaItem != null && agendaItems.length > 0
      ? buildCanonicalAgendaDisplayOrderMap(agendaItems)
      : null;
  const position = agendaItem && displayOrder ? displayOrder.get(agendaItem.id) ?? null : null;

  if (agendaItem && position != null) {
    links.push({
      label: `Traktandum ${position}: ${agendaItem.title}`,
      href: buildMeetingTraktandumDeepLink(meeting.slug, agendaItem.id),
      restricted: false,
    });
  }

  if (refs.decisionId) {
    const decision = await prisma.meetingDecision.findFirst({
      where: {
        id: refs.decisionId,
        meetingId: meeting.id,
        meeting: { tenantId: actor.tenantId ?? undefined },
      },
      select: { id: true, title: true },
    });
    if (decision) {
      links.push({
        label: decision.title,
        href: null,
        restricted: false,
      });
    }
  }

  return links.length > 0 ? { links } : null;
}

export async function loadMeetingActionOriginMap(
  actor: ActorContext,
  meeting: Parameters<typeof resolveMeetingActionOrigin>[1],
  actions: Array<{ id: string; linkedRefs?: unknown }>,
  agendaItems: Array<{ id: string; orderIndex: number }>,
): Promise<Record<string, MeetingOutcomeOrigin>> {
  const map: Record<string, MeetingOutcomeOrigin> = {};
  await Promise.all(
    actions.map(async (action) => {
      const origin = await resolveMeetingActionOrigin(actor, meeting, action.linkedRefs, agendaItems);
      if (origin && origin.links.length > 0) {
        map[action.id] = origin;
      }
    }),
  );
  return map;
}