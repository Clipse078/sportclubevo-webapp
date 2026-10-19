import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "./tournament-composer-planner-defaults";
import { sanitizeOrganiserDraftFields } from "./tournament-composer-organiser";
import {
  normalizeComposerBreakDraft,
  type LegacyComposerBreakDraft,
} from "./tournament-composer-planner-breaks";
import { reconcileComposerPlannerForParticipants } from "./tournament-composer-programme-template";

export function hydrateTournamentComposerFormFromDraft(
  payload: TournamentComposerDraftPayload,
): TournamentComposerDraftPayload {
  const organiserFields = sanitizeOrganiserDraftFields(
    payload.homeAway ?? "HOME",
    payload.organizerExternalClubId,
    payload.organizerExternalClubName,
  );
  return {
    ...payload,
    organizerExternalClubId: organiserFields.organizerExternalClubId,
    organizerExternalClubName: organiserFields.organizerExternalClubName,
    title: payload.title ?? "Turnier",
    description: payload.description ?? "",
    location: payload.location ?? "",
    participants: Array.isArray(payload.participants) ? payload.participants : [],
    resourceAllocations: Array.isArray(payload.resourceAllocations) ? payload.resourceAllocations : [],
    publication: payload.publication ?? {
      websiteVisible: true,
      infoboardVisible: true,
      homepageVisible: true,
      wochenplanVisible: true,
      teamPageVisible: true,
    },
    planner:
      payload.homeAway === "HOME"
        ? (() => {
            const participants = Array.isArray(payload.participants) ? payload.participants : [];
            const base =
              payload.planner ?? createDefaultTournamentComposerPlannerDraft();
            const normalized = {
              ...base,
              breaks: base.breaks.map((br) =>
                normalizeComposerBreakDraft(br as LegacyComposerBreakDraft),
              ),
            };
            return reconcileComposerPlannerForParticipants({
              planner: normalized,
              participantCount: participants.length,
            });
          })()
        : null,
  };
}
