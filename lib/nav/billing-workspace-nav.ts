import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

export type BillingWorkspaceNavItem = {
  key: string;
  label: string;
  href: string;
  permissionKeys?: PermissionKey[];
  /** Match only exact path (overview). */
  exact?: boolean;
};

export const BILLING_WORKSPACE_BASE = "/dashboard/admin/commercial/billing";

export const BILLING_WORKSPACE_PRIMARY_NAV: BillingWorkspaceNavItem[] = [
  {
    key: "overview",
    label: "Übersicht",
    href: BILLING_WORKSPACE_BASE,
    exact: true,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
  {
    key: "customers",
    label: "Kunden",
    href: `${BILLING_WORKSPACE_BASE}/customers`,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
  {
    key: "contracts",
    label: "Verträge",
    href: `${BILLING_WORKSPACE_BASE}/contracts`,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
  {
    key: "invoices",
    label: "Rechnungen",
    href: `${BILLING_WORKSPACE_BASE}/invoices`,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
  {
    key: "reconciliation",
    label: "Bankabgleich",
    href: `${BILLING_WORKSPACE_BASE}/reconciliation`,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
];

export const BILLING_WORKSPACE_ADMIN_NAV: BillingWorkspaceNavItem[] = [
  {
    key: "settings",
    label: "Einstellungen",
    href: `${BILLING_WORKSPACE_BASE}/settings`,
    permissionKeys: [PERMISSIONS.BILLING_VIEW],
  },
  {
    key: "operations",
    label: "Operations",
    href: `${BILLING_WORKSPACE_BASE}/operations`,
    permissionKeys: [PERMISSIONS.BILLING_MANAGE],
  },
];

export function billingNavItemIsActive(
  pathname: string,
  item: BillingWorkspaceNavItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
