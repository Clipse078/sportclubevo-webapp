/**
 * FIN-07A — server-authoritative commitment permission helpers.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { hasFinancePermission, requireFinanceView } from "@/lib/finance/finance-authorization";
import { FINANCE_COMMITMENT_PERMISSION_KEYS } from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/** Compile-time alignment with architecture contract keys. */
const _permissionKeyAlignment: Record<
  keyof typeof FINANCE_COMMITMENT_PERMISSION_KEYS,
  string
> = {
  view: PERMISSIONS.FINANCE_COMMITMENT_VIEW,
  manage: PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
  submit: PERMISSIONS.FINANCE_COMMITMENT_SUBMIT,
  approve: PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
  policyManage: PERMISSIONS.FINANCE_COMMITMENT_POLICY_MANAGE,
};
void _permissionKeyAlignment;

export function canViewFinanceCommitments(ctx: FinanceAuthContext): boolean {
  return (
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_COMMITMENT_VIEW)
  );
}

export function canManageFinanceCommitments(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_COMMITMENT_MANAGE);
}

export function canSubmitFinanceCommitments(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_COMMITMENT_SUBMIT);
}

export function canApproveFinanceCommitments(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_COMMITMENT_APPROVE);
}

export function canManageFinanceCommitmentPolicy(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_COMMITMENT_POLICY_MANAGE);
}

export function requireFinanceCommitmentFoundationView(ctx: FinanceAuthContext): void {
  requireFinanceView(ctx);
  if (!canViewFinanceCommitments(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view financial commitments.",
      403,
    );
  }
}
