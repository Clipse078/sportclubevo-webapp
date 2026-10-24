"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildFinanceForecastSubTabNavigationConfig,
  type FinanceForecastSubTabId,
} from "@/lib/finance/finance-forecast-sub-tab-config";

type FinanceForecastSubContextTabsProps = {
  labels: {
    current: string;
    scenarios: string;
  };
  ariaLabel: string;
};

export function FinanceForecastSubContextTabs({
  labels,
  ariaLabel,
}: FinanceForecastSubContextTabsProps) {
  const config = buildFinanceForecastSubTabNavigationConfig({ labels });

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs<FinanceForecastSubTabId>
        config={config}
        ariaLabel={ariaLabel}
        testId="finance-forecast-sub-tabs"
        idPrefix="finance-forecast-sub-tab"
      />
    </SceContextTabProvider>
  );
}
