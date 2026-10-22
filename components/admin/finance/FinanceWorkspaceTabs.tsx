"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildFinanceTabNavigationConfig,
  type FinanceWorkspaceTabId,
} from "@/lib/finance/finance-tab-config";

type FinanceWorkspaceTabsProps = {
  showSettings: boolean;
  labels: { overview: string; settings: string };
  ariaLabel: string;
};

export function FinanceWorkspaceTabs({
  showSettings,
  labels,
  ariaLabel,
}: FinanceWorkspaceTabsProps) {
  const config = buildFinanceTabNavigationConfig({ showSettings, labels });

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs<FinanceWorkspaceTabId>
        config={config}
        ariaLabel={ariaLabel}
        testId="finance-workspace-tabs"
        idPrefix="finance-tab"
      />
    </SceContextTabProvider>
  );
}
