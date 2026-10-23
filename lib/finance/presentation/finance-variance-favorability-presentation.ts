import type { VarianceFavorability } from "@/lib/finance/actual/variance-semantics";
import type { SceSemanticFeedbackTone } from "@/lib/design-system/sce-feedback-status-foundation";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";

export const FINANCE_VARIANCE_FAVORABILITY_LABEL_KEYS = {
  FAVORABLE: "favorabilityFavorable",
  UNFAVORABLE: "favorabilityUnfavorable",
  ON_PLAN: "favorabilityOnPlan",
} as const;

export type FinanceVarianceFavorabilityLabelKey =
  (typeof FINANCE_VARIANCE_FAVORABILITY_LABEL_KEYS)[VarianceFavorability];

/** Maps canonical favorability to DS-07 semantic feedback tone — not raw delta sign. */
export function varianceFavorabilityToFeedbackTone(
  favorability: VarianceFavorability,
): SceSemanticFeedbackTone {
  switch (favorability) {
    case "FAVORABLE":
      return "SUCCESS";
    case "UNFAVORABLE":
      return "ERROR";
    case "ON_PLAN":
      return "NEUTRAL";
  }
}

export function financeVarianceFavorabilityLabelKey(
  favorability: VarianceFavorability,
): FinanceVarianceFavorabilityLabelKey {
  return FINANCE_VARIANCE_FAVORABILITY_LABEL_KEYS[favorability];
}

const FINANCE_VARIANCE_NO_COMPARISON_TEXT_CLASS = "text-[var(--muted)]";

/**
 * Restrained semantic text color for Abweichung and Bewertung cells.
 * When comparison is unavailable (missing budget or actual), stay muted.
 */
export function financeVarianceComparisonSemanticTextClass(input: {
  favorability: VarianceFavorability | null;
  hasComparison: boolean;
}): string {
  if (!input.hasComparison || input.favorability === null) {
    return FINANCE_VARIANCE_NO_COMPARISON_TEXT_CLASS;
  }
  return sceSemanticIconClass(varianceFavorabilityToFeedbackTone(input.favorability));
}
