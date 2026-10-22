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
