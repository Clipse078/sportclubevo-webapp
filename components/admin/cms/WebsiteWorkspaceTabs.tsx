"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import {
  buildWebsiteWorkspaceTabNavigationConfig,
  type WebsiteWorkspaceTabId,
} from "@/lib/cms/website-tab-config";

type WebsiteWorkspaceTabsProps = {
  ariaLabel?: string;
};

/** Website CMS workspace navigation — finance-aligned `SceContextTabs`. */
export function WebsiteWorkspaceTabs({
  ariaLabel = "Website",
}: WebsiteWorkspaceTabsProps) {
  const config = buildWebsiteWorkspaceTabNavigationConfig();

  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs<WebsiteWorkspaceTabId>
        config={config}
        ariaLabel={ariaLabel}
        testId="website-workspace-tabs"
        idPrefix="website-tab"
      />
    </SceContextTabProvider>
  );
}
