import type { SceSemanticFeedbackTone } from "@/lib/design-system/sce-feedback-status-foundation";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";

/**
 * Canonical finance result semantics (income − expense net result).
 * Independent of budget favorability / variance comparison semantics.
 */
export type FinanceResultPresentation = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export function deriveFinanceResultPresentation(amountMinor: number): FinanceResultPresentation {
  if (amountMinor > 0) return "POSITIVE";
  if (amountMinor < 0) return "NEGATIVE";
  return "NEUTRAL";
}

export function financeResultPresentationToFeedbackTone(
  presentation: FinanceResultPresentation,
): SceSemanticFeedbackTone {
  switch (presentation) {
    case "POSITIVE":
      return "SUCCESS";
    case "NEGATIVE":
      return "ERROR";
    case "NEUTRAL":
      return "NEUTRAL";
  }
}

/**
 * Semantic text color for any calculated finance net/result value (minor units).
 * Neutral keeps the base summary typography (foreground) without extra class.
 */
export function financeResultSemanticTextClass(amountMinor: number): string {
  const presentation = deriveFinanceResultPresentation(amountMinor);
  if (presentation === "NEUTRAL") {
    return "";
  }
  return sceSemanticIconClass(
    financeResultPresentationToFeedbackTone(presentation),
  );
}
