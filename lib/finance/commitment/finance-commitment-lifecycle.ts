/**
 * FIN-07A — commitment lifecycle invariants.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import {
  FINANCE_COMMITMENT_LIFECYCLE,
  type FinanceCommitmentApprovalStatus,
  type FinanceCommitmentLifecycleStatus,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";

export function assertFinanceCommitmentLifecycleTransition(
  from: FinanceCommitmentLifecycleStatus,
  to: FinanceCommitmentLifecycleStatus,
): void {
  if (from === to) return;
  const allowed = FINANCE_COMMITMENT_LIFECYCLE.allowedTransitions[from];
  if (!(allowed as readonly string[]).includes(to)) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_INVALID_TRANSITION",
      `Commitment cannot transition from ${from} to ${to}.`,
      409,
    );
  }
}

export function assertFinanceCommitmentMayBecomeActive(input: {
  lifecycleStatus: FinanceCommitmentLifecycleStatus;
  approvalStatus: FinanceCommitmentApprovalStatus;
}): void {
  if (input.lifecycleStatus !== "SUBMITTED" && input.lifecycleStatus !== "ACTIVE") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_INVALID_STATE",
      "Only submitted commitments may become active.",
      409,
    );
  }
  if (
    input.approvalStatus !== "APPROVED" &&
    input.approvalStatus !== "NOT_REQUIRED"
  ) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_APPROVAL_REQUIRED",
      "Commitment approval must be APPROVED or NOT_REQUIRED before becoming active.",
      409,
    );
  }
}
