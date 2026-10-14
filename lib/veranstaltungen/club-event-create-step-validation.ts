import type { ClubEventComposerDraftPayload } from "@/lib/club-events/composer/club-event-composer-draft-types";
import type { ClubEventCreateTabId } from "@/lib/veranstaltungen/club-event-create-workflow-config";
import type { SceActivityCreateValidationResult } from "@/lib/sce/activity-composer/types";
import { computeClubEventCreateTabErrors } from "@/lib/veranstaltungen/club-event-create-validation";

export function validateClubEventCreateWorkflowStep(
  draft: ClubEventComposerDraftPayload,
  stepKey: ClubEventCreateTabId,
): SceActivityCreateValidationResult<ClubEventCreateTabId> {
  const allErrors = computeClubEventCreateTabErrors({
    seasonId: draft.seasonId,
    title: draft.title,
    schedule: draft.schedule,
    audience: draft.audience,
    recurrenceEnabled: draft.recurrence.enabled,
    recurrenceEndDate: draft.recurrence.endDate,
    recurrenceOccurrenceCount: String(draft.recurrence.occurrenceCount),
    recurrenceEndMode: draft.recurrence.endMode,
  });
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
export function resolveClubEventCreateStepValid(
  draft: ClubEventComposerDraftPayload,
  stepKey: ClubEventCreateTabId,
): boolean {
  const allErrors = computeClubEventCreateTabErrors({
    seasonId: draft.seasonId,
    title: draft.title,
    schedule: draft.schedule,
    audience: draft.audience,
    recurrenceEnabled: draft.recurrence.enabled,
    recurrenceEndDate: draft.recurrence.endDate,
    recurrenceOccurrenceCount: String(draft.recurrence.occurrenceCount),
    recurrenceEndMode: draft.recurrence.endMode,
  });
  return !allErrors[stepKey];
}

/** @deprecated Use `resolveClubEventCreateStepValid` — validity ≠ completed. */
export const resolveClubEventCreateStepComplete = resolveClubEventCreateStepValid;
