import type { ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import {
  BILLING_WORKSPACE_ADMIN_NAV,
  BILLING_WORKSPACE_BASE,
  BILLING_WORKSPACE_PRIMARY_NAV,
  billingNavItemIsActive,
} from "@/lib/nav/billing-workspace-nav";

export type BillingWorkspaceTabId =
  | "overview"
  | "customers"
  | "contracts"
  | "invoices"
  | "reconciliation"
  | "settings"
  | "operations";

const TAB_ROUTES: Record<BillingWorkspaceTabId, string> = {
  overview: BILLING_WORKSPACE_BASE,
  customers: `${BILLING_WORKSPACE_BASE}/customers`,
  contracts: `${BILLING_WORKSPACE_BASE}/contracts`,
  invoices: `${BILLING_WORKSPACE_BASE}/invoices`,
  reconciliation: `${BILLING_WORKSPACE_BASE}/reconciliation`,
  settings: `${BILLING_WORKSPACE_BASE}/settings`,
  operations: `${BILLING_WORKSPACE_BASE}/operations`,
};

export function resolveBillingWorkspaceTabFromPathname(
  pathname: string,
): BillingWorkspaceTabId {
  for (const item of [...BILLING_WORKSPACE_ADMIN_NAV, ...BILLING_WORKSPACE_PRIMARY_NAV]) {
    if (billingNavItemIsActive(pathname, item)) {
      return item.key as BillingWorkspaceTabId;
    }
  }
  return "overview";
}

export function buildBillingWorkspaceTabNavigationConfig(options: {
  showOperations: boolean;
}): ContextTabNavigationConfig<BillingWorkspaceTabId> {
  const tabs: ContextTabNavigationConfig<BillingWorkspaceTabId>["tabs"] = [
    { key: "overview", label: "Übersicht", placement: "primary" },
    { key: "customers", label: "Kunden", placement: "primary" },
    { key: "contracts", label: "Verträge", placement: "primary" },
    { key: "invoices", label: "Rechnungen", placement: "primary" },
    { key: "reconciliation", label: "Bankabgleich", placement: "primary" },
    { key: "settings", label: "Einstellungen", placement: "overflow" },
  ];

  if (options.showOperations) {
    tabs.push({ key: "operations", label: "Operations", placement: "overflow" });
  }

  return {
    contextKind: "BILLING_WORKSPACE",
    defaultTab: "overview",
    tabRoutes: TAB_ROUTES,
    resolveActiveTabFromPathname: (pathname, visibleKeys) => {
      const resolved = resolveBillingWorkspaceTabFromPathname(pathname);
      return visibleKeys.includes(resolved) ? resolved : null;
    },
    tabs,
  };
}
