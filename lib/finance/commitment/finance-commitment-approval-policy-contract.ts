/**
 * FIN-07D — commitment approval policy architecture (tenant threshold v1).
 */

export const FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS = {
  /** Matches FIN-07B behaviour: every positive submission required approval. */
  enabled: true,
  thresholdAmountMinor: 0,
} as const;

/** Approval required when enabled and amountMinor >= threshold (inclusive boundary). */
export const FINANCE_COMMITMENT_APPROVAL_THRESHOLD_BOUNDARY = "INCLUSIVE_GTE" as const;

export const FINANCE_COMMITMENT_APPROVAL_POLICY_EXPLANATION_KIND = [
  "POLICY_DISABLED",
  "NOT_REQUIRED_BELOW_THRESHOLD",
  "REQUIRED_AT_OR_ABOVE_THRESHOLD",
  "REQUIRED_CURRENCY_MISMATCH",
  "DRAFT_PREVIEW",
] as const;

export type FinanceCommitmentApprovalPolicyExplanationKind =
  (typeof FINANCE_COMMITMENT_APPROVAL_POLICY_EXPLANATION_KIND)[number];

export type FinanceCommitmentApprovalPolicySnapshot = {
  enabled: boolean;
  thresholdAmountMinor: number;
  thresholdCurrency: string;
};

export type FinanceCommitmentApprovalEvaluationInput = {
  policy: FinanceCommitmentApprovalPolicySnapshot;
  amountMinor: number;
  currency: string;
};

export type FinanceCommitmentApprovalEvaluationResult = {
  approvalRequired: boolean;
  explanationKind: FinanceCommitmentApprovalPolicyExplanationKind;
};

