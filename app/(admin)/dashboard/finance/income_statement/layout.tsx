import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

/**
 * DS2-07A — governance chrome for the income_statement alias route.
 * The page redirects immediately to reporting; this layout aligns inventory with Finance workspace architecture.
 */
export default function FinanceIncomeStatementAliasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageShell>
      <SceWorkspaceChrome>{children}</SceWorkspaceChrome>
    </PageShell>
  );
}
