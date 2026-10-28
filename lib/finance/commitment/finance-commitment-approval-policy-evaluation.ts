/**
 * FIN-07D — deterministic approval requirement from tenant policy + commitment amount.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import { assertSafeAmountMinor } from "@/lib/finance/money-types";
import {
  FINANCE_COMMITMENT_APPROVAL_THRESHOLD_BOUNDARY,
  type FinanceCommitmentApprovalEvaluationInput,
  type FinanceCommitmentApprovalEvaluationResult,
  type FinanceCommitmentApprovalPolicySnapshot,
  FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS,
} from "@/lib/finance/commitment/finance-commitment-approval-policy-contract";

export function normalizeFinanceCommitmentApprovalPolicySnapshot(
  row: FinanceCommitmentApprovalPolicySnapshot | null | undefined,
  baseCurrency: string | null,
): FinanceCommitmentApprovalPolicySnapshot {
  const currency =
    row?.thresholdCurrency?.trim().toUpperCase() ??
    baseCurrency?.trim().toUpperCase() ??
    "";
  return {
    enabled: row?.enabled ?? FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS.enabled,
    thresholdAmountMinor:
      row?.thresholdAmountMinor ??
      FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS.thresholdAmountMinor,
    thresholdCurrency: currency,
  };
}

export function assertValidApprovalPolicyThreshold(thresholdAmountMinor: number): void {
  assertSafeAmountMinor(thresholdAmountMinor);
  if (thresholdAmountMinor < 0) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_POLICY_VALIDATION",
      "Approval threshold cannot be negative.",
      400,
    );
  }
}

export function evaluateFinanceCommitmentApprovalRequirement(
  input: FinanceCommitmentApprovalEvaluationInput,
): FinanceCommitmentApprovalEvaluationResult {
  assertSafeAmountMinor(input.amountMinor);
  if (input.amountMinor <= 0) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_VALIDATION",
      "Commitment amount must be greater than zero.",
      400,
    );
  }

  const policy = input.policy;
  if (!policy.enabled) {
    return {
      approvalRequired: false,
      explanationKind: "POLICY_DISABLED",
    };
  }

  const commitmentCurrency = input.currency.trim().toUpperCase();
  const policyCurrency = policy.thresholdCurrency.trim().toUpperCase();
  if (!policyCurrency) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_POLICY_VALIDATION",
      "Configure the finance base currency before using approval thresholds.",
      400,
    );
  }

  if (commitmentCurrency !== policyCurrency) {
    return {
      approvalRequired: true,
      explanationKind: "REQUIRED_CURRENCY_MISMATCH",
    };
  }

  assertValidApprovalPolicyThreshold(policy.thresholdAmountMinor);

  const meetsThreshold =
    FINANCE_COMMITMENT_APPROVAL_THRESHOLD_BOUNDARY === "INCLUSIVE_GTE"
      ? input.amountMinor >= policy.thresholdAmountMinor
      : input.amountMinor > policy.thresholdAmountMinor;

  if (meetsThreshold) {
    return {
      approvalRequired: true,
      explanationKind: "REQUIRED_AT_OR_ABOVE_THRESHOLD",
    };
  }

  return {
    approvalRequired: false,
    explanationKind: "NOT_REQUIRED_BELOW_THRESHOLD",
  };
}

export function resolveSubmitApprovalStatus(
  evaluation: FinanceCommitmentApprovalEvaluationResult,
): "PENDING" | "NOT_REQUIRED" {
  return evaluation.approvalRequired ? "PENDING" : "NOT_REQUIRED";
}
