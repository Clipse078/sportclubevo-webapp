"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildFinanceTabNavigationConfig,
  type FinanceWorkspaceTabId,
} from "@/lib/finance/finance-tab-config";

type FinanceWorkspaceTabsProps = {
  showStructure: boolean;
  showSettings: boolean;
  labels: { overview: string; structure: string; settings: string };
  ariaLabel: string;
};

export function FinanceWorkspaceTabs({
  showStructure,
  showSettings,
  labels,
  ariaLabel,
}: FinanceWorkspaceTabsProps) {
  const config = buildFinanceTabNavigationConfig({ showStructure, showSettings, labels });

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
