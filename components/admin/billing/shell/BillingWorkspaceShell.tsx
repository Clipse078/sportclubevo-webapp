import type { ReactNode } from "react";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Props = {
  children: ReactNode;
};

/**
 * Permission gate for the commercial billing workspace.
 * Contextual tabs render inside each page header (`BillingWorkspaceTabs` → `SceContextTabs`)
 * so breadcrumbs, title, and tabs keep the finance order.
 */
export default async function BillingWorkspaceShell({ children }: Props) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  return <div className="w-full min-w-0">{children}</div>;
}
