"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildGovernanceWorkspaceTabNavigationConfig } from "@/lib/nav/governance-workspace-tab-config";

/** Canonical tabs for platform roles and permissions. */
export default function GovernanceWorkspaceTabs() {
  const config = buildGovernanceWorkspaceTabNavigationConfig();
  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs
        config={config}
        ariaLabel="Governance"
        testId="governance-workspace-tabs"
        idPrefix="governance-workspace-tab"
      />
    </SceContextTabProvider>
  );
}
