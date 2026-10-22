import type { FinanceCapabilityKey } from "@prisma/client";
import {
  FINANCE_WORKSPACE_NAV,
  isFinanceCapabilityImplemented,
  type FinanceNavEntry,
} from "@/lib/finance/capability-registry";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { hasFinancePermission } from "@/lib/finance/finance-authorization";
import type { PermissionKey } from "@/lib/permissions/permissions";

export type ResolvedFinanceNavItem = FinanceNavEntry & {
  labelKey: string;
};

function entryPermitted(
  ctx: FinanceAuthContext,
  permissionKeys: readonly PermissionKey[],
): boolean {
  return permissionKeys.some((key) => hasFinancePermission(ctx, key));
}

function entryCapabilitiesSatisfied(
  enabled: ReadonlySet<FinanceCapabilityKey>,
  required: readonly FinanceCapabilityKey[],
): boolean {
  if (required.length === 0) return true;
  return required.every((cap) => enabled.has(cap) && isFinanceCapabilityImplemented(cap));
}

export function resolveFinanceNavigation(input: {
  ctx: FinanceAuthContext;
  enabledCapabilities: ReadonlySet<FinanceCapabilityKey>;
  setupConfigured: boolean;
}): ResolvedFinanceNavItem[] {
  if (!input.setupConfigured) {
    return FINANCE_WORKSPACE_NAV.filter(
      (entry) =>
        entry.key === "overview" ||
        (entry.key === "structure" && entryPermitted(input.ctx, entry.permissionKeys)),
    );
  }

  return FINANCE_WORKSPACE_NAV.filter((entry) => {
    if (!entryPermitted(input.ctx, entry.permissionKeys)) return false;
    if (entry.key === "structure") return true;
    return entryCapabilitiesSatisfied(input.enabledCapabilities, entry.requiredCapabilities);
  });
}
