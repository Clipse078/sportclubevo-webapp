import { prisma } from "@/lib/db/prisma";
import type { ActorContext } from "@/lib/visibility/actor-context";

/**
 * Validates that an agenda item belongs to the meeting and tenant.
 * Returns null when cleared; throws when invalid.
 */
export async function resolveMeetingDecisionAgendaLink(
  actor: ActorContext,
  meetingId: string,
  sourceAgendaItemId: string | null | undefined,
): Promise<string | null> {
  if (!sourceAgendaItemId?.trim()) {
    return null;
  }
  const agendaItemId = sourceAgendaItemId.trim();
  if (!actor.tenantId) {
    throw new Error("Traktandum nicht gefunden.");
  }
  const item = await prisma.meetingAgendaItem.findFirst({
    where: {
      id: agendaItemId,
      meetingId,
      meeting: { tenantId: actor.tenantId },
    },
    select: { id: true },
  });
  if (!item) {
    throw new Error("Traktandum gehört nicht zu dieser Sitzung.");
  }
  return agendaItemId;
}
