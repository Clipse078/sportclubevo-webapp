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

function resolveFinanceNavigationEntry(
  input: {
    ctx: FinanceAuthContext;
    enabledCapabilities: ReadonlySet<FinanceCapabilityKey>;
  },
  entry: FinanceNavEntry,
): boolean {
  if (!entryPermitted(input.ctx, entry.permissionKeys)) return false;
  if (entry.key === "structure") return true;
  return entryCapabilitiesSatisfied(input.enabledCapabilities, entry.requiredCapabilities);
}

export function resolveFinanceNavigation(input: {
  ctx: FinanceAuthContext;
  enabledCapabilities: ReadonlySet<FinanceCapabilityKey>;
  /** Retained for callers; capability nav no longer hides implemented surfaces by setup status. */
  setupConfigured: boolean;
}): ResolvedFinanceNavItem[] {
  return FINANCE_WORKSPACE_NAV.filter((entry) =>
    resolveFinanceNavigationEntry(input, entry),
  );
}
