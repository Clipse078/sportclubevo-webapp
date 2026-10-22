import { PERMISSIONS } from "@/lib/permissions/permissions";
import type { PermissionKey } from "@/lib/permissions/permissions";

/** Same predicate as requireAnyPermission for /dashboard/finance (finance.view only). */
export function isFinanceWorkspaceRouteAuthorized(
  platformPermissionKeys: readonly string[],
  tenantPermissionKeys: readonly string[],
): boolean {
  const required: PermissionKey[] = [PERMISSIONS.FINANCE_VIEW];
  return required.some(
    (key) => platformPermissionKeys.includes(key) || tenantPermissionKeys.includes(key),
  );
}
