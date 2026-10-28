import type { FinanceCommitmentApprovalPolicyExplanationKind } from "@/lib/finance/commitment/finance-commitment-approval-policy-contract";

export type FinanceCommitmentApprovalExplanation = {
  kind: FinanceCommitmentApprovalPolicyExplanationKind;
  thresholdAmountMinor: number | null;
  thresholdCurrency: string | null;
  isDraftPreview: boolean;
};

export function buildSubmittedApprovalExplanation(input: {
  lifecycleStatus: string;
  approvalStatus: string;
  currency: string;
  approvalPolicyEnabledSnapshot: boolean | null;
  approvalThresholdMinorSnapshot: number | null;
  approvalPolicyCurrencySnapshot: string | null;
}): FinanceCommitmentApprovalExplanation | null {
  if (input.lifecycleStatus === "DRAFT") {
    return null;
  }
  if (input.approvalStatus === "NOT_REQUIRED") {
    if (input.approvalPolicyEnabledSnapshot === false) {
      return {
        kind: "POLICY_DISABLED",
        thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
        thresholdCurrency: input.approvalPolicyCurrencySnapshot,
        isDraftPreview: false,
      };
    }
    return {
      kind: "NOT_REQUIRED_BELOW_THRESHOLD",
      thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
      thresholdCurrency: input.approvalPolicyCurrencySnapshot,
      isDraftPreview: false,
    };
  }
  if (input.approvalStatus === "PENDING") {
    const commitmentCurrency = input.currency.trim().toUpperCase();
    const policyCurrency = input.approvalPolicyCurrencySnapshot?.trim().toUpperCase() ?? "";
    if (policyCurrency && commitmentCurrency !== policyCurrency) {
      return {
        kind: "REQUIRED_CURRENCY_MISMATCH",
        thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
        thresholdCurrency: input.approvalPolicyCurrencySnapshot,
        isDraftPreview: false,
      };
    }
    return {
      kind: "REQUIRED_AT_OR_ABOVE_THRESHOLD",
      thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
      thresholdCurrency: input.approvalPolicyCurrencySnapshot,
      isDraftPreview: false,
    };
  }
  if (input.approvalStatus === "APPROVED" || input.approvalStatus === "REJECTED") {
    return null;
  }
  return null;
}

export function buildDraftApprovalPreviewExplanation(input: {
  evaluationKind: FinanceCommitmentApprovalPolicyExplanationKind;
  thresholdAmountMinor: number;
  thresholdCurrency: string;
}): FinanceCommitmentApprovalExplanation {
  return {
    kind: input.evaluationKind,
    thresholdAmountMinor: input.thresholdAmountMinor,
    thresholdCurrency: input.thresholdCurrency,
    isDraftPreview: true,
  };
}
