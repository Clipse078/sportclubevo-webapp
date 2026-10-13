import type { MatchComposerDraftPayload } from "./match-composer-draft-types";

export function hydrateMatchComposerFormFromDraft(
  payload: MatchComposerDraftPayload,
): MatchComposerDraftPayload {
  return {
    ...payload,
    location: payload.location ?? "",
    opponentName: payload.opponentName ?? "",
    spielbetrieb: {
      competitionLabel: payload.spielbetrieb?.competitionLabel ?? "",
      remarks: payload.spielbetrieb?.remarks ?? "",
    },
    resources: Array.isArray(payload.resources) ? payload.resources : [],
  };
}
