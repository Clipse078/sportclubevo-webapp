import type { ReactNode } from "react";
import BillingWorkspaceShell from "@/components/admin/billing/shell/BillingWorkspaceShell";

type Props = {
  children: ReactNode;
};

export default function CommercialBillingLayout({ children }: Props) {
  return <BillingWorkspaceShell>{children}</BillingWorkspaceShell>;
}
