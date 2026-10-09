/**
 * SCE-COLLAB-01C-R3 — re-resolve collaboration impact after participation-audience
 * configuration changes without clearing an unresolved activity-change cycle.
 */

import { parseCollaborationCycleBaselineFromBody } from "@/lib/collaboration/activity-change/cycle-baseline";
import { buildClubEventApiCollaborationPayload } from "@/lib/collaboration/club-event/club-event-api-collaboration";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";

export async function appendClubEventParticipationAudienceCollaboration(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  eventId: string;
  requestBody: Record<string, unknown> | null;
}) {
  const cycleBaseline = input.requestBody
    ? parseCollaborationCycleBaselineFromBody(input.requestBody, "CLUB_EVENT", input.eventId)
    : null;
  if (!cycleBaseline) {
    return {};
  }

  const beforeSnapshot = await loadClubEventActivitySnapshot({
    tenantId: input.tenantId,
    eventId: input.eventId,
  });
  if (!beforeSnapshot) {
    return {};
  }

  return buildClubEventApiCollaborationPayload({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    eventId: input.eventId,
    beforeSnapshot,
    cycleBaseline,
  });
}
