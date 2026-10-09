/**
 * SCE-COLLAB-01C — assemble club event change impact after successful mutations.
 */

import type { ActivityChangeImpact } from "@/lib/collaboration/activity-change/types";
import { buildClubEventActivityChangeImpact } from "@/lib/collaboration/club-event/club-event-activity-change";
import type { ClubEventActivitySnapshot } from "@/lib/collaboration/club-event/club-event-activity-snapshot";
import { listClubEventAudienceEntries } from "@/lib/events/club-event-participation-audience-service";
import {
  CLUB_EVENT_INVALID_AUDIENCE_LABEL_DE,
  CLUB_EVENT_NO_AUDIENCE_LABEL_DE,
  classifyClubEventParticipationAudience,
} from "@/lib/collaboration/club-event/club-event-audience-presentation";
import { resolveClubEventAudienceContext } from "@/lib/collaboration/club-event/resolve-club-event-audience";
import { resolveClubEventAudiencePreview } from "@/lib/collaboration/club-event/resolve-club-event-audience-preview";

function displayOnlyClubEventAudience(input: {
  eventId: string;
  label: string;
  audienceNotConfigured?: boolean;
  audienceInvalid?: boolean;
}): NonNullable<ActivityChangeImpact["audience"]> {
  return {
    teamId: input.eventId,
    teamName: input.label,
    teamNamesLabel: input.label,
    recipientPreviewLabel: null,
    effectiveRecipientCount: null,
    zeroRecipients: false,
    audienceNotConfigured: input.audienceNotConfigured,
    audienceInvalid: input.audienceInvalid,
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
  const classification = classifyClubEventParticipationAudience(participationEntries);

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
      audience = displayOnlyClubEventAudience({
        eventId: input.after.eventId,
        label: audienceContext.audienceLabel,
      });
    }
  } else if (classification.state === "NONE") {
    audience = displayOnlyClubEventAudience({
      eventId: input.after.eventId,
      label: CLUB_EVENT_NO_AUDIENCE_LABEL_DE,
      audienceNotConfigured: true,
    });
  } else if (classification.state === "INVALID") {
    const label =
      classification.partialLabel?.trim() || CLUB_EVENT_INVALID_AUDIENCE_LABEL_DE;
    audience = displayOnlyClubEventAudience({
      eventId: input.after.eventId,
      label,
      audienceInvalid: true,
    });
  }

  const impact = buildClubEventActivityChangeImpact({
    before: input.before,
    after: input.after,
    canCommunicate,
    audience,
  });

  return impact.worthy ? impact : null;
}
