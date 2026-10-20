"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildBillingWorkspaceTabNavigationConfig } from "@/lib/nav/billing-workspace-tab-config";

type Props = {
  showOperations?: boolean;
};

/**
 * Billing module — canonical `SceContextTabs` (DS-10).
 * Replaces legacy BillingWorkspaceNav link rows.
 */
export default function BillingWorkspaceContextTabs({ showOperations = true }: Props) {
  const config = buildBillingWorkspaceTabNavigationConfig({ showOperations });

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs
        config={config}
        ariaLabel="Abrechnung"
        testId="billing-workspace-tabs"
        idPrefix="billing-workspace-tab"
      />
    </SceContextTabProvider>
  );
}
