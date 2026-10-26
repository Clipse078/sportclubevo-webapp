/**
 * FIN-06A — server-authoritative publishing & sharing permission helpers.
 */

import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { hasFinancePermission, requireFinanceView } from "@/lib/finance/finance-authorization";
import { FINANCE_PUBLISHING_PERMISSION_KEYS } from "@/lib/finance/publishing/finance-publishing-sharing-architecture-contract";
import { PERMISSIONS } from "@/lib/permissions/permissions";

/** Compile-time alignment with architecture contract keys. */
const _permissionKeyAlignment: Record<
  keyof typeof FINANCE_PUBLISHING_PERMISSION_KEYS,
  string
> = {
  viewFinancialReports: PERMISSIONS.FINANCE_VIEW,
  viewPublicationHistory: PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  shareFinancialReports: PERMISSIONS.FINANCE_REPORTING_SHARE,
  publishFinancialReports: PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  manageFinancialShares: PERMISSIONS.FINANCE_SHARE_MANAGE,
};
void _permissionKeyAlignment;

export function canViewFinancePublicationHistory(ctx: FinanceAuthContext): boolean {
  return (
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_PUBLICATION_VIEW)
  );
}

export function canShareFinancialReports(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_REPORTING_SHARE);
}

export function canPublishFinancialReports(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_REPORTING_PUBLISH);
}

export function canManageFinancialShares(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_SHARE_MANAGE);
}

export function requireFinancePublicationFoundationView(ctx: FinanceAuthContext): void {
  requireFinanceView(ctx);
  if (!canViewFinancePublicationHistory(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view financial publications.",
      403,
    );
  }
}

export function requireFinanceReportingShare(ctx: FinanceAuthContext): void {
  if (!canShareFinancialReports(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to share financial reports.",
      403,
    );
  }
}

export function requireFinanceReportingPublish(ctx: FinanceAuthContext): void {
  if (!canPublishFinancialReports(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to publish financial reports.",
      403,
    );
  }
}

export function requireFinanceShareManage(ctx: FinanceAuthContext): void {
  if (!canManageFinancialShares(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage financial shares.",
      403,
    );
  }
}

export function canManagePublicationShares(ctx: FinanceAuthContext): boolean {
  return canShareFinancialReports(ctx) || canManageFinancialShares(ctx);
}

export function requireFinancePublicationShareCreate(ctx: FinanceAuthContext): void {
  requireFinanceReportingShare(ctx);
}

export function requireFinancePublicationShareManagement(ctx: FinanceAuthContext): void {
  if (!canManagePublicationShares(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage publication shares.",
      403,
    );
  }
}
