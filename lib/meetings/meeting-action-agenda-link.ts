import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  buildMeetingActionAgendaLinkedRefs,
  type MeetingLinkedRefs,
} from "@/lib/meetings/meeting-protocol-linked-refs";

export { buildMeetingActionAgendaLinkedRefs };

/**
 * Validates agenda item id for MeetingAction.linkedRefs (canonical JSON link until AUFGABEN-04).
 */
export async function resolveMeetingActionAgendaLink(
  actor: ActorContext,
  meetingId: string,
  agendaItemId: string | null | undefined,
): Promise<MeetingLinkedRefs> {
  if (!agendaItemId?.trim()) {
    return {};
  }
  const trimmed = agendaItemId.trim();
  if (!actor.tenantId) {
    throw new Error("Traktandum nicht gefunden.");
  }
  const item = await prisma.meetingAgendaItem.findFirst({
    where: {
      id: trimmed,
      meetingId,
      meeting: { tenantId: actor.tenantId },
    },
    select: { id: true },
  });
  if (!item) {
    throw new Error("Traktandum gehört nicht zu dieser Sitzung.");
  }
  return buildMeetingActionAgendaLinkedRefs(trimmed);
}