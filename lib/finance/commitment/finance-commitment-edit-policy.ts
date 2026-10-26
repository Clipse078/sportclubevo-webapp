/**
 * FIN-07B — conservative edit semantics (documented for reviewers).
 *
 * - DRAFT: fully editable (obligation key remains immutable at persistence layer).
 * - SUBMITTED and beyond: not editable via ordinary workspace edit (07C may add return-to-draft).
 * - ACTIVE: amount/classification changes forbidden without explicit future domain operations.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type {
  FinanceCommitmentApprovalStatus,
  FinanceCommitmentLifecycleStatus,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";

export const FINANCE_COMMITMENT_EDIT_POLICY = {
  editableLifecycleStatuses: ["DRAFT"] as const satisfies readonly FinanceCommitmentLifecycleStatus[],
  submittedEditableIn07B: false,
  activeFinancialMutationAllowedIn07B: false,
} as const;

export function assertFinanceCommitmentEditable(input: {
  lifecycleStatus: FinanceCommitmentLifecycleStatus;
  approvalStatus: FinanceCommitmentApprovalStatus;
}): void {
  if (input.lifecycleStatus !== "DRAFT") {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_NOT_EDITABLE",
      "This commitment can no longer be edited.",
      409,
    );
  }
}

export function assertFinanceCommitmentDeletable(input: {
  lifecycleStatus: FinanceCommitmentLifecycleStatus;
  submittedAt: Date | null;
}): void {
  if (input.lifecycleStatus !== "DRAFT" || input.submittedAt) {
    throw new FinanceDomainError(
      "FINANCE_COMMITMENT_DELETE_FORBIDDEN",
      "Submitted commitments cannot be deleted. Cancel the commitment instead.",
      409,
    );
  }
}
