"use client";

import type { FinanceCommitmentApprovalExplanation } from "@/lib/finance/commitment/finance-commitment-approval-policy-presentation";
import { formatFinanceManagementPlanningMinor } from "@/lib/finance/budget/budget-amount-presentation";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export function FinanceCommitmentApprovalExplanationText({
  explanation,
  t,
  formattingLocale,
}: {
  explanation: FinanceCommitmentApprovalExplanation;
  t: TranslateFn;
  formattingLocale: string;
}) {
  const thresholdLabel =
    explanation.thresholdAmountMinor != null &&
    explanation.thresholdCurrency &&
    explanation.kind !== "POLICY_DISABLED"
      ? formatFinanceManagementPlanningMinor(
          explanation.thresholdAmountMinor,
          explanation.thresholdCurrency,
          formattingLocale,
        )
      : null;

  const keyPrefix = explanation.isDraftPreview ? "approvalPreview" : "approvalExplanation";

  let messageKey: string;
  switch (explanation.kind) {
    case "POLICY_DISABLED":
      messageKey = `${keyPrefix}PolicyDisabled`;
      break;
    case "NOT_REQUIRED_BELOW_THRESHOLD":
      messageKey = `${keyPrefix}NotRequiredBelow`;
      break;
    case "REQUIRED_AT_OR_ABOVE_THRESHOLD":
      messageKey = `${keyPrefix}RequiredAbove`;
      break;
    case "REQUIRED_CURRENCY_MISMATCH":
      messageKey = `${keyPrefix}RequiredCurrencyMismatch`;
      break;
    default:
      messageKey = `${keyPrefix}RequiredAbove`;
  }

  return (
    <p
      className="text-xs text-[var(--muted)]"
      data-finance-commitment-approval-explanation
      data-finance-commitment-approval-explanation-kind={explanation.kind}
    >
      {t(messageKey, thresholdLabel ? { threshold: thresholdLabel } : undefined)}
    </p>
  );
}
