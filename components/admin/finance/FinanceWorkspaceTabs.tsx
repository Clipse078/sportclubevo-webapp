"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildFinanceTabNavigationConfig,
  type FinanceWorkspaceTabId,
} from "@/lib/finance/finance-tab-config";

type FinanceWorkspaceTabsProps = {
  showStructure: boolean;
  showReporting: boolean;
  showBudget: boolean;
  showActuals: boolean;
  showForecast: boolean;
  showCommitments: boolean;
  showSettings: boolean;
  labels: {
    overview: string;
    structure: string;
    reporting: string;
    budget: string;
    actuals: string;
    forecast: string;
    commitments: string;
    settings: string;
  };
  ariaLabel: string;
};

export function FinanceWorkspaceTabs({
  showStructure,
  showReporting,
  showBudget,
  showActuals,
  showForecast,
  showCommitments,
  showSettings,
  labels,
  ariaLabel,
}: FinanceWorkspaceTabsProps) {
  const config = buildFinanceTabNavigationConfig({
    showStructure,
    showReporting,
    showBudget,
    showActuals,
    showForecast,
    showCommitments,
    showSettings,
    labels,
  });

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
