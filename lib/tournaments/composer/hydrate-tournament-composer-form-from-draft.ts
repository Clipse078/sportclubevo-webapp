import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

export function hydrateTournamentComposerFormFromDraft(
  payload: TournamentComposerDraftPayload,
): TournamentComposerDraftPayload {
  return {
    ...payload,
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
  };
}
