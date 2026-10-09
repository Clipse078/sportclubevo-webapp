import { buildCollaborationMutationResponse } from "@/lib/collaboration/activity-change/collaboration-mutation-result";
import type { ClubEventCollaborationCycleBaseline } from "@/lib/collaboration/activity-change/cycle-baseline";
import { loadClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { buildClubEventMutationCollaborationImpact } from "@/lib/collaboration/club-event/club-event-mutation-collaboration";

export async function buildClubEventApiCollaborationPayload(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  eventId: string;
  beforeSnapshot: Awaited<ReturnType<typeof loadClubEventActivitySnapshot>>;
  cycleBaseline?: ClubEventCollaborationCycleBaseline | null;
}) {
  const collaborationResult = await buildClubEventMutationCollaborationImpact({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    eventId: input.eventId,
    beforeSnapshot: input.beforeSnapshot,
    cycleBaseline: input.cycleBaseline ?? null,
  });
  return buildCollaborationMutationResponse(collaborationResult);
}
