import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type FinanceAuthContext = {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
};

export function hasFinancePermission(
  ctx: FinanceAuthContext,
  key: PermissionKey,
): boolean {
  return ctx.permissionKeys.has(key);
}

export function requireFinanceView(ctx: FinanceAuthContext): void {
  if (!hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view organisation finance.",
      403,
    );
  }
}

export function requireFinanceStructureManage(ctx: FinanceAuthContext): void {
  if (!hasFinancePermission(ctx, PERMISSIONS.FINANCE_STRUCTURE_MANAGE)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage finance structure.",
      403,
    );
  }
}

export function requireFinanceAdmin(ctx: FinanceAuthContext): void {
  if (!hasFinancePermission(ctx, PERMISSIONS.FINANCE_ADMIN)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to administer finance configuration.",
      403,
    );
  }
}

export function canMutateFinanceStructure(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_STRUCTURE_MANAGE);
}

export function requireFinanceBudgetView(ctx: FinanceAuthContext): void {
  if (
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_BUDGET_VIEW)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view budgets.",
      403,
    );
  }
}

export function requireFinanceBudgetManage(ctx: FinanceAuthContext): void {
  if (!hasFinancePermission(ctx, PERMISSIONS.FINANCE_BUDGET_MANAGE)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage draft budgets.",
      403,
    );
  }
}

export function requireFinanceBudgetApprove(ctx: FinanceAuthContext): void {
  if (
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_APPROVE) &&
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_ADMIN)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to approve budgets.",
      403,
    );
  }
}

export function canManageDraftBudget(ctx: FinanceAuthContext): boolean {
  return hasFinancePermission(ctx, PERMISSIONS.FINANCE_BUDGET_MANAGE);
}

export function canApproveBudget(ctx: FinanceAuthContext): boolean {
  return (
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_APPROVE) ||
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_ADMIN)
  );
}

export function requireFinanceActualView(ctx: FinanceAuthContext): void {
  if (
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_ACTUAL_VIEW)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view actuals.",
      403,
    );
  }
}

export function requireFinanceActualManage(ctx: FinanceAuthContext): void {
  if (!canManageActuals(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage actuals.",
      403,
    );
  }
}

export function canManageActuals(ctx: FinanceAuthContext): boolean {
  return (
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_ACTUAL_MANAGE) ||
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_ADMIN)
  );
}

export function requireFinanceForecastView(ctx: FinanceAuthContext): void {
  if (
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_VIEW) &&
    !hasFinancePermission(ctx, PERMISSIONS.FINANCE_FORECAST_VIEW)
  ) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to view forecasts.",
      403,
    );
  }
}

export function requireFinanceForecastManage(ctx: FinanceAuthContext): void {
  if (!canManageForecast(ctx)) {
    throw new FinanceDomainError(
      "FINANCE_FORBIDDEN",
      "Insufficient permission to manage forecasts.",
      403,
    );
  }
}

export function canManageForecast(ctx: FinanceAuthContext): boolean {
  return (
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_FORECAST_MANAGE) ||
    hasFinancePermission(ctx, PERMISSIONS.FINANCE_ADMIN)
  );
}
