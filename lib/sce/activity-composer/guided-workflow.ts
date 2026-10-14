import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityCreateValidationResult } from "./types";

export type SceActivityGuidedStepVisualState = "current" | "completed" | "pending" | "error";

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
  /** Optional domain completion signal for progress checkmarks. */
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
  stepComplete?: boolean;
}): SceActivityGuidedStepVisualState {
  const { tabKey, activeTab, orderedTabKeys, tabErrors, stepComplete } = input;
  const hasError = Boolean(tabErrors?.[tabKey]);

  if (tabKey === activeTab) {
    return hasError ? "error" : "current";
  }
  if (hasError) {
    return "error";
  }
  if (stepComplete) {
    return "completed";
  }

  return "pending";
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
