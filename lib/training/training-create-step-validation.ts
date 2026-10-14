import type { TrainingComposerDraftPayload } from "@/lib/training/composer/training-composer-draft-types";
import type { TrainingCreateTabId } from "@/lib/training/training-create-workflow-config";
import type { SceActivityCreateValidationResult } from "@/lib/sce/activity-composer/types";
import { computeTrainingCreateTabErrors } from "@/lib/training/training-create-validation";

export function validateTrainingCreateWorkflowStep(
  draft: TrainingComposerDraftPayload,
  stepKey: TrainingCreateTabId,
): SceActivityCreateValidationResult<TrainingCreateTabId> {
  const allErrors = computeTrainingCreateTabErrors(draft);
  if (!allErrors[stepKey]) {
    return { valid: true, tabErrors: {} };
  }
  return {
    valid: false,
    tabErrors: { [stepKey]: true },
    firstInvalidTab: stepKey,
  };
}

/** Step validity only — composer pairs with reviewed state for checkmarks (01E-R6). */
export function resolveTrainingCreateStepValid(
  draft: TrainingComposerDraftPayload,
  stepKey: TrainingCreateTabId,
): boolean {
  const allErrors = computeTrainingCreateTabErrors(draft);
  if (stepKey === "ressourcen" || stepKey === "pruefen") {
    return true;
  }
  return !allErrors[stepKey];
}

/** @deprecated Use `resolveTrainingCreateStepValid` — validity ≠ completed. */
export const resolveTrainingCreateStepComplete = resolveTrainingCreateStepValid;
