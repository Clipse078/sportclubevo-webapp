import type { ActorContext } from "@/lib/visibility/actor-context";
import {
  buildMeetingActionAgendaLinkedRefs,
  type MeetingLinkedRefs,
} from "@/lib/meetings/meeting-protocol-linked-refs";
import { resolveMeetingActionLinkedRefs } from "@/lib/meetings/meeting-action-linked-refs";

export { buildMeetingActionAgendaLinkedRefs };

/**
 * Validates agenda item id for MeetingAction.linkedRefs (canonical JSON link until AUFGABEN-04).
 */
export async function resolveMeetingActionAgendaLink(
  actor: ActorContext,
  meetingId: string,
  agendaItemId: string | null | undefined,
): Promise<MeetingLinkedRefs> {
  return resolveMeetingActionLinkedRefs(actor, meetingId, { agendaItemId });
}