import type { ReactNode } from "react";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";

type Props = {
  children: ReactNode;
};

export default async function BillingWorkspaceShell({ children }: Props) {
  await requirePermission(PERMISSIONS.BILLING_VIEW);

  return <div className="w-full space-y-8">{children}</div>;
}
