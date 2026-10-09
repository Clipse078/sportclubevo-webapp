/**
 * SCE-COLLAB-01C — assemble club event change impact after successful mutations.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeImpact } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { listClubEventAudienceEntries } from "@/lib/events/club-event-participation-audience-service";
import {
  formatClubEventParticipationAudienceLabel,
  resolveClubEventAudienceContext,
} from "@/lib/collaboration/club-event/resolve-club-event-audience";
import { resolveClubEventAudiencePreview } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";

function displayOnlyClubEventAudience(
  eventId: string,
  label: string,
): NonNullable<ActivityChangeImpact["audience"]> {
  return {
    teamId: eventId,
    teamName: label,
    teamNamesLabel: label,
    recipientPreviewLabel: null,
    effectiveRecipientCount: null,
    zeroRecipients: false,
  };
}

export async function resolveClubEventCollaborationImpactAfterChange(input: {
  tenantId: string;
  tenantKey: string;
  userId: string;
  before: ClubEventActivitySnapshot;
  after: ClubEventActivitySnapshot;
}): Promise<ActivityChangeImpact | null> {
  const participationEntries = await listClubEventAudienceEntries(
    input.tenantId,
    input.after.eventId,
  );
  const participationAudienceLabel =
    formatClubEventParticipationAudienceLabel(participationEntries);

  const audienceContext = await resolveClubEventAudienceContext({
    tenantId: input.tenantId,
    snapshot: input.after,
  });

  let canCommunicate = false;
  let audience: ActivityChangeImpact["audience"] = null;

  if (audienceContext) {
    try {
      const preview = await resolveClubEventAudiencePreview({
        tenantId: input.tenantId,
        tenantKey: input.tenantKey,
        userId: input.userId,
        eventId: input.after.eventId,
        audienceContext,
      });
      canCommunicate = preview.canCommunicate;
      audience = preview.audience;
    } catch {
      audience = displayOnlyClubEventAudience(
        input.after.eventId,
        audienceContext.audienceLabel,
      );
    }
  } else if (participationAudienceLabel) {
    audience = displayOnlyClubEventAudience(input.after.eventId, participationAudienceLabel);
  }

  const impact = buildClubEventActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience,
  });

  return impact.worthy ? impact : null;
}
