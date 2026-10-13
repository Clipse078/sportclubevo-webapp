import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export type TrainingComposerHydratedFormState = TrainingComposerDraftPayload;

export function hydrateTrainingComposerFormFromDraft(
  payload: TrainingComposerDraftPayload,
): TrainingComposerHydratedFormState {
  return { ...payload };
}
