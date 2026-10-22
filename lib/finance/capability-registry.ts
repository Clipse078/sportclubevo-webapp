import {
  FINANCE_CAPABILITY_KEYS,
  FINANCE_NAVIGATION_ENTRIES,
  PROPOSED_FINANCE_PERMISSION_KEYS,
  type FinanceCapabilityKey,
} from "@/lib/finance/finance-architecture";
import type { PermissionKey } from "@/lib/permissions/permissions";
import { filterFinanceStarterRecommendedCapabilityKeys } from "@/lib/finance/capability-presentation";

/** Capabilities with product surfaces implemented in FIN-01B. */
export const FINANCE_CAPABILITIES_IMPLEMENTED_01B: ReadonlySet<FinanceCapabilityKey> =
  new Set(["OVERVIEW"]);

export const FINANCE_SYSTEM_CAPABILITY_KEYS = FINANCE_CAPABILITY_KEYS;

export type FinanceNavEntry = {
  key: string;
  href: string;
  labelKey: string;
  requiredCapabilities: readonly FinanceCapabilityKey[];
  permissionKeys: readonly PermissionKey[];
};

export const FINANCE_WORKSPACE_NAV: FinanceNavEntry[] = FINANCE_NAVIGATION_ENTRIES.map(
  (entry) => ({
    key: entry.key,
    href:
      entry.key === "overview"
        ? "/dashboard/finance"
        : entry.key === "structure"
          ? "/dashboard/finance/settings"
          : `/dashboard/finance/${entry.key}`,
    labelKey: entry.labelKey,
    requiredCapabilities: [...entry.requiredCapabilities] as FinanceCapabilityKey[],
    permissionKeys: [...entry.permissionKeys] as PermissionKey[],
  }),
);

export function isFinanceCapabilityImplemented(
  capability: FinanceCapabilityKey,
): boolean {
  return FINANCE_CAPABILITIES_IMPLEMENTED_01B.has(capability);
}

export const FINANCE_DEFAULT_ENABLED_CAPABILITIES: FinanceCapabilityKey[] = ["OVERVIEW"];

/** UX guidance only — excludes capabilities not yet available for tenant configuration. */
export const FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS: readonly FinanceCapabilityKey[] =
  filterFinanceStarterRecommendedCapabilityKeys(isFinanceCapabilityImplemented);

export {
  FINANCE_CAPABILITY_PRESENTATION,
  FINANCE_CAPABILITY_PRESENTATION_ORDER,
  filterFinanceStarterRecommendedCapabilityKeys,
  getFinanceCapabilityPresentation,
  type FinanceCapabilityPresentation,
} from "@/lib/finance/capability-presentation";

export { PROPOSED_FINANCE_PERMISSION_KEYS };
