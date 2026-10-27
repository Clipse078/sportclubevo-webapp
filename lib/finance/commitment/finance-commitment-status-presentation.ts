import type {
  FinanceCommitmentApprovalStatus,
  FinanceCommitmentLifecycleStatus,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";

export function financeCommitmentLifecycleLabelKey(
  status: FinanceCommitmentLifecycleStatus | string,
): `lifecycle${string}` {
  switch (status) {
    case "DRAFT":
      return "lifecycleDraft";
    case "SUBMITTED":
      return "lifecycleSubmitted";
    case "ACTIVE":
      return "lifecycleActive";
    case "FULFILLED":
      return "lifecycleFulfilled";
    case "CANCELLED":
      return "lifecycleCancelled";
    default:
      return "lifecycleDraft";
  }
}

export function financeCommitmentApprovalLabelKey(
  status: FinanceCommitmentApprovalStatus | string,
): `approval${string}` {
  switch (status) {
    case "NOT_REQUIRED":
      return "approvalNotRequired";
    case "PENDING":
      return "approvalPending";
    case "APPROVED":
      return "approvalApproved";
    case "REJECTED":
      return "approvalRejected";
    default:
      return "approvalNotRequired";
  }
}
