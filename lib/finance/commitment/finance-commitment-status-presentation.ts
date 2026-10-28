import type { BadgeVariant } from "@/components/ui/Badge";
import type {
  FinanceCommitmentApprovalStatus,
  FinanceCommitmentLifecycleStatus,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";

export type FinanceCommitmentLifecycleBadgeVariant = Extract<
  BadgeVariant,
  "default" | "info" | "success" | "outline"
>;

export type FinanceCommitmentApprovalBadgeVariant = Extract<
  BadgeVariant,
  "default" | "success" | "warning" | "danger"
>;

/** Canonical Badge variant for commitment lifecycle (orthogonal to approval). */
export function financeCommitmentLifecycleBadgeVariant(
  status: FinanceCommitmentLifecycleStatus | string,
): FinanceCommitmentLifecycleBadgeVariant {
  switch (status) {
    case "DRAFT":
      return "default";
    case "SUBMITTED":
      return "info";
    case "ACTIVE":
      return "success";
    case "FULFILLED":
      return "info";
    case "CANCELLED":
      return "outline";
    default:
      return "default";
  }
}

/** Canonical Badge variant for commitment approval (orthogonal to lifecycle). */
export function financeCommitmentApprovalBadgeVariant(
  status: FinanceCommitmentApprovalStatus | string,
): FinanceCommitmentApprovalBadgeVariant | null {
  switch (status) {
    case "NOT_REQUIRED":
      return null;
    case "PENDING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    default:
      return null;
  }
}

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
