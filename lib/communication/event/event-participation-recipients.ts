/**
 * SCE-COMM-10 — Event recipient presets from canonical ParticipationResponse state.
 *
 * Implementation lives in {@link listParticipationSubjectPersonIds} (shared core).
 */

import type { EventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  EVENT_PRESET_PARTICIPATION_FILTER,
  type EventContextAudienceRequest,
} from "@/lib/communication/platform/seams/event-communication-seam";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import {
  countParticipationPreset,
  listParticipationSubjectPersonIds,
} from "@/lib/participation/participation-audience-resolution";

export type EventParticipationRecipientFilter =
  (typeof EVENT_PRESET_PARTICIPATION_FILTER)[EventAudiencePreset];

export async function listEventParticipationSubjectPersonIds(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: EventAudiencePreset;
}): Promise<string[]> {
  return listParticipationSubjectPersonIds(input);
}

export async function countEventParticipationPreset(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: EventAudiencePreset;
}): Promise<number> {
  return countParticipationPreset(input);
}

export function eventAudienceSpecFromPersonIds(personIds: readonly string[]) {
  return {
    composition: "UNION" as const,
    components: [
      {
        label: "Event participation preset",
        explicit: { includePersonIds: [...personIds] },
      },
    ],
  };
}

export type EventParticipationAudiencePreview = {
  preset: EventAudiencePreset;
  eligibleCount: number;
  filter: EventParticipationRecipientFilter;
};

export async function previewEventParticipationAudiences(input: {
  anchor: ResolvedEventParticipationAnchor;
  presets: readonly EventAudiencePreset[];
}): Promise<EventParticipationAudiencePreview[]> {
  const results: EventParticipationAudiencePreview[] = [];
  for (const preset of input.presets) {
    const eligibleCount = await countEventParticipationPreset({ anchor: input.anchor, preset });
    results.push({
      preset,
      eligibleCount,
      filter: EVENT_PRESET_PARTICIPATION_FILTER[preset],
    });
  }
  return results;
}

export function toEventContextAudienceRequest(
  tenantId: string,
  anchor: ResolvedEventParticipationAnchor,
  preset: EventAudiencePreset,
): EventContextAudienceRequest {
  return {
    tenantId,
    eventId: anchor.contextEventId,
    preset,
  };
}
