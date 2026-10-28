import type { FinanceCommitmentApprovalPolicyExplanationKind } from "@/lib/finance/commitment/finance-commitment-approval-policy-contract";

export type FinanceCommitmentApprovalExplanation = {
  kind: FinanceCommitmentApprovalPolicyExplanationKind;
  thresholdAmountMinor: number | null;
  thresholdCurrency: string | null;
  isDraftPreview: boolean;
  /** Canonical policy outcome — same evaluation drives preview copy and draft submit CTA. */
  approvalRequired: boolean;
};

export type FinanceCommitmentDraftSubmitMessageKey =
  | "submitAction"
  | "submitActionDirect";

export function resolveFinanceCommitmentDraftSubmitMessageKey(
  explanation: FinanceCommitmentApprovalExplanation | null,
): FinanceCommitmentDraftSubmitMessageKey {
  if (explanation?.isDraftPreview && !explanation.approvalRequired) {
    return "submitActionDirect";
  }
  return "submitAction";
}

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
        approvalRequired: false,
      };
    }
    return {
      kind: "NOT_REQUIRED_BELOW_THRESHOLD",
      thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
      thresholdCurrency: input.approvalPolicyCurrencySnapshot,
      isDraftPreview: false,
      approvalRequired: false,
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
        approvalRequired: true,
      };
    }
    return {
      kind: "REQUIRED_AT_OR_ABOVE_THRESHOLD",
      thresholdAmountMinor: input.approvalThresholdMinorSnapshot,
      thresholdCurrency: input.approvalPolicyCurrencySnapshot,
      isDraftPreview: false,
      approvalRequired: true,
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
  approvalRequired: boolean;
}): FinanceCommitmentApprovalExplanation {
  return {
    kind: input.evaluationKind,
    thresholdAmountMinor: input.thresholdAmountMinor,
    thresholdCurrency: input.thresholdCurrency,
    isDraftPreview: true,
    approvalRequired: input.approvalRequired,
  };
}
