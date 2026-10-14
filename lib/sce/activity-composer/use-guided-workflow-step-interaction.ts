"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextTabId } from "@/lib/context-tabs/types";
import {
  resolveGuidedStepVisualState,
  type SceActivityGuidedWorkflowConfig,
} from "./guided-workflow";

export type GuidedWorkflowStepInteractionState<TTabId extends ContextTabId> = {
  /** Marks the step as reviewed when the user leaves it or completes «Weiter». */
  markStepReviewed: (stepKey: TTabId) => void;
  /** For workflow nav — reviewed and currently valid (final review tab never completes). */
  resolveNavStepComplete: (stepKey: TTabId) => boolean;
  resolveStepValid: (stepKey: TTabId) => boolean;
  /** Full visual state including unvisited / current / completed / error. */
  resolveStepVisualState: (stepKey: TTabId) => ReturnType<typeof resolveGuidedStepVisualState>;
};

/**
 * UI-session reviewed-step tracking (01E-R6).
 * Domain draft persistence remains authoritative; reviewed state is not stored in DB.
 */
export function useGuidedWorkflowStepInteraction<
  TDraft,
  TTabId extends ContextTabId,
>(input: {
  orderedTabKeys: readonly TTabId[];
  activeTab: TTabId;
  guidedWorkflow: SceActivityGuidedWorkflowConfig<TDraft, TTabId>;
  draft: TDraft;
  tabErrors?: Partial<Record<TTabId, boolean>>;
}): GuidedWorkflowStepInteractionState<TTabId> {
  const { orderedTabKeys, activeTab, guidedWorkflow, draft, tabErrors } = input;
  const [reviewedSteps, setReviewedSteps] = useState<ReadonlySet<TTabId>>(() => new Set());

  const previousTabRef = useRef(activeTab);

  useEffect(() => {
    const previous = previousTabRef.current;
    if (previous !== activeTab) {
      setReviewedSteps((prev) => {
        if (prev.has(previous)) {
          return prev;
        }
        const next = new Set(prev);
        next.add(previous);
        return next;
      });
      previousTabRef.current = activeTab;
    }
  }, [activeTab]);

  const resolveStepValid = useCallback(
    (stepKey: TTabId): boolean => {
      if (guidedWorkflow.resolveStepValid) {
        return guidedWorkflow.resolveStepValid(draft, stepKey);
      }
      if (guidedWorkflow.resolveStepComplete) {
        return guidedWorkflow.resolveStepComplete(draft, stepKey);
      }
      if (guidedWorkflow.validateStep) {
        return guidedWorkflow.validateStep(draft, stepKey).valid;
      }
      return true;
    },
    [draft, guidedWorkflow],
  );

  const markStepReviewed = useCallback((stepKey: TTabId) => {
    setReviewedSteps((prev) => {
      if (prev.has(stepKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(stepKey);
      return next;
    });
  }, []);

  const resolveStepVisualState = useCallback(
    (stepKey: TTabId) =>
      resolveGuidedStepVisualState({
        tabKey: stepKey,
        activeTab,
        orderedTabKeys,
        tabErrors,
        reviewed: reviewedSteps.has(stepKey),
        stepValid: resolveStepValid(stepKey),
        finalReviewTab: guidedWorkflow.finalReviewTab,
      }),
    [
      activeTab,
      guidedWorkflow.finalReviewTab,
      orderedTabKeys,
      resolveStepValid,
      reviewedSteps,
      tabErrors,
    ],
  );

  const resolveNavStepComplete = useCallback(
    (stepKey: TTabId) => resolveStepVisualState(stepKey) === "completed",
    [resolveStepVisualState],
  );

  return {
    markStepReviewed,
    resolveNavStepComplete,
    resolveStepValid,
    resolveStepVisualState,
  };
}
