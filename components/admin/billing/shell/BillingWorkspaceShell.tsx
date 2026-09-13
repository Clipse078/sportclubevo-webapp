import type { ReactNode } from "react";
import BillingWorkspaceNav from "@/components/admin/billing/shell/BillingWorkspaceNav";
import { hasPermission } from "@/lib/permissions/has-permission";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Props = {
  children: ReactNode;
};

export default async function BillingWorkspaceShell({ children }: Props) {
  const session = await requirePermission(PERMISSIONS.BILLING_VIEW);
  const showOperations = hasPermission(session, PERMISSIONS.BILLING_MANAGE);

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-8">
      <BillingWorkspaceNav showOperations={showOperations} />
      {children}
    </div>
  );
}
