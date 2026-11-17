import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  buildMeetingActionLinkedRefs,
  type MeetingLinkedRefs,
} from "@/lib/meetings/meeting-protocol-linked-refs";

export type MeetingActionLinkedRefsInput = {
  agendaItemId?: string | null;
  decisionId?: string | null;
};

/**
 * Validates MeetingAction.linkedRefs (agenda + optional Beschluss) for one meeting tenant.
 * Never drops an explicit decision reference when the client sends both ids.
 */
export async function resolveMeetingActionLinkedRefs(
  actor: ActorContext,
  meetingId: string,
  input: MeetingActionLinkedRefsInput,
): Promise<MeetingLinkedRefs> {
  const requestedAgendaId = input.agendaItemId?.trim() || undefined;
  const requestedDecisionId = input.decisionId?.trim() || undefined;

  if (!requestedAgendaId && !requestedDecisionId) {
    return {};
  }

  if (!actor.tenantId) {
    throw new Error("Traktandum nicht gefunden.");
  }

  if (requestedAgendaId) {
    const item = await prisma.meetingAgendaItem.findFirst({
      where: {
        id: requestedAgendaId,
        meetingId,
        meeting: { tenantId: actor.tenantId },
      },
      select: { id: true },
    });
    if (!item) {
      throw new Error("Traktandum gehört nicht zu dieser Sitzung.");
    }
  }

  if (!requestedDecisionId) {
    return buildMeetingActionLinkedRefs({ agendaItemId: requestedAgendaId });
  }

  const decision = await prisma.meetingDecision.findFirst({
    where: {
      id: requestedDecisionId,
      meetingId,
      meeting: { tenantId: actor.tenantId },
    },
    select: { id: true, sourceAgendaItemId: true },
  });
  if (!decision) {
    throw new Error("Beschluss gehört nicht zu dieser Sitzung.");
  }

  const agendaItemId = requestedAgendaId ?? decision.sourceAgendaItemId ?? undefined;
  if (requestedAgendaId && decision.sourceAgendaItemId && decision.sourceAgendaItemId !== requestedAgendaId) {
    throw new Error("Beschluss gehört nicht zu diesem Traktandum.");
  }

  return buildMeetingActionLinkedRefs({
    agendaItemId,
    decisionId: decision.id,
  });
}