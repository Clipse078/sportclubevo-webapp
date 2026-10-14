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

export function resolveTrainingCreateStepComplete(
  draft: TrainingComposerDraftPayload,
  stepKey: TrainingCreateTabId,
): boolean {
  const allErrors = computeTrainingCreateTabErrors(draft);
  return !allErrors[stepKey];
}
