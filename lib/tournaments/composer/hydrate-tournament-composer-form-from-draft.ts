import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";
import { createDefaultTournamentComposerPlannerDraft } from "./tournament-composer-planner-defaults";
import { sanitizeOrganiserDraftFields } from "./tournament-composer-organiser";

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
        ? (payload.planner ??
          createDefaultTournamentComposerPlannerDraft())
        : null,
  };
}
