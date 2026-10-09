/**
 * SCE-COLLAB-01C — assemble club event change impact after successful mutations.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeImpact } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { resolveClubEventAudienceContext } from "@/lib/collaboration/club-event/resolve-club-event-audience";
import { resolveClubEventAudiencePreview } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";

export async function resolveClubEventCollaborationImpactAfterChange(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  before: ClubEventActivitySnapshot;
  after: ClubEventActivitySnapshot;
}): Promise<ActivityChangeImpact | null> {
  const audienceContext = await resolveClubEventAudienceContext({
    tenantId: input.tenantId,
    snapshot: input.after,
  });
  if (!audienceContext) {
    const impact = buildClubEventActivityChangeImpact({
      before: input.before,
      after: input.after,
      canCommunicate: false,
      audience: null,
    });
    return impact.worthy ? impact : null;
  }

  const { canCommunicate, audience } = await resolveClubEventAudiencePreview({
    tenantId: input.tenantId,
    tenantKey: input.tenantKey,
    userId: input.userId,
    eventId: input.after.eventId,
    audienceContext,
  });

  const impact = buildClubEventActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience,
  });

  return impact.worthy ? impact : null;
}
