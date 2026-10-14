import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityCreateValidationResult } from "./types";

export type SceActivityGuidedStepVisualState =
  | "current"
  | "unvisited"
  | "completed"
  | "error";

/** @deprecated Use `unvisited` — kept for transitional imports. */
export type SceActivityGuidedStepVisualStateLegacy = SceActivityGuidedStepVisualState | "pending";

export type SceActivityGuidedWorkflowConfig<
  TDraft,
  TTabId extends ContextTabId,
> = {
  /** Final review tab — domain primary action is shown only on this step. */
  finalReviewTab: TTabId;
  /**
   * Step-scoped validation for «Weiter» guidance.
   * Full `validateDraft` remains authoritative on final submit.
   */
  validateStep?: (
    draft: TDraft,
    stepKey: TTabId,
  ) => SceActivityCreateValidationResult<TTabId>;
  /**
   * Domain validity for a step (does not imply reviewed/completed).
   * When omitted, `validateStep` validity is used when present.
   */
  resolveStepValid?: (draft: TDraft, stepKey: TTabId) => boolean;
  /**
   * @deprecated 01E-R6 — composer derives checkmarks from reviewed + `resolveStepValid`.
   * Kept temporarily for adopters migrating to `resolveStepValid`.
   */
  resolveStepComplete?: (draft: TDraft, stepKey: TTabId) => boolean;
};

export function resolveGuidedWorkflowEnabled<TDraft, TTabId extends ContextTabId>(
  guidedWorkflow: SceActivityGuidedWorkflowConfig<TDraft, TTabId> | undefined,
): guidedWorkflow is SceActivityGuidedWorkflowConfig<TDraft, TTabId> {
  return guidedWorkflow != null;
}

export function resolveGuidedStepIndex<TTabId extends ContextTabId>(
  orderedTabKeys: readonly TTabId[],
  activeTab: TTabId,
): number {
  const index = orderedTabKeys.indexOf(activeTab);
  return index >= 0 ? index : 0;
}

export function resolveGuidedPreviousStep<TTabId extends ContextTabId>(
  orderedTabKeys: readonly TTabId[],
  activeTab: TTabId,
): TTabId | null {
  const index = resolveGuidedStepIndex(orderedTabKeys, activeTab);
  if (index <= 0) {
    return null;
  }
  return orderedTabKeys[index - 1] ?? null;
}

export function resolveGuidedNextStep<TTabId extends ContextTabId>(
  orderedTabKeys: readonly TTabId[],
  activeTab: TTabId,
): TTabId | null {
  const index = resolveGuidedStepIndex(orderedTabKeys, activeTab);
  if (index < 0 || index >= orderedTabKeys.length - 1) {
    return null;
  }
  return orderedTabKeys[index + 1] ?? null;
}

export function resolveGuidedStepVisualState<TTabId extends ContextTabId>(input: {
  tabKey: TTabId;
  activeTab: TTabId;
  orderedTabKeys: readonly TTabId[];
  tabErrors?: Partial<Record<TTabId, boolean>>;
  /** @deprecated Use `reviewed` + `stepValid` (01E-R6). */
  stepComplete?: boolean;
  /** User has visited/reviewed this step in the current composer session. */
  reviewed?: boolean;
  /** Current domain validity for the step (optional ≠ valid for UX). */
  stepValid?: boolean;
  finalReviewTab?: TTabId;
}): SceActivityGuidedStepVisualState {
  const {
    tabKey,
    activeTab,
    tabErrors,
    stepComplete,
    reviewed = false,
    stepValid = true,
    finalReviewTab,
  } = input;
  const hasError = Boolean(tabErrors?.[tabKey]);
  const isFinalReview = finalReviewTab != null && tabKey === finalReviewTab;

  if (tabKey === activeTab) {
    if (hasError || (reviewed && !stepValid)) {
      return "error";
    }
    return "current";
  }

  if (hasError || (reviewed && !stepValid)) {
    return "error";
  }

  const legacyCompleted = stepComplete === true;
  const r6Completed =
    reviewed && stepValid && !isFinalReview;

  if (legacyCompleted || r6Completed) {
    return "completed";
  }

  return "unvisited";
}

export function resolveGuidedStepCompleteDefault<TTabId extends ContextTabId>(input: {
  tabKey: TTabId;
  activeTab: TTabId;
  orderedTabKeys: readonly TTabId[];
  tabErrors?: Partial<Record<TTabId, boolean>>;
}): boolean {
  const state = resolveGuidedStepVisualState({
    ...input,
    stepComplete: false,
  });
  return state === "completed";
}

export function isGuidedFinalReviewStep<TDraft, TTabId extends ContextTabId>(
  guidedWorkflow: SceActivityGuidedWorkflowConfig<TDraft, TTabId>,
  activeTab: TTabId,
): boolean {
  return activeTab === guidedWorkflow.finalReviewTab;
}
