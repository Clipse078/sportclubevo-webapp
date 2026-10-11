"use client";

import type { ActivityTabNavigationConfig } from "@/lib/activity-navigation/types";
import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";

type Props = {
  config: ActivityTabNavigationConfig;
  ariaLabel?: string;
  testId?: string;
};

/**
 * SCE-ACTIVITY-NAV-01 — activity detail navigation (01B: generic SceContextTabs + activity ids).
 */
export default function ActivityDetailNavigation({
  config,
  ariaLabel = "Aktivität",
  testId = "activity-detail-nav",
}: Props) {
  return (
    <SceContextTabs
      config={config}
      ariaLabel={ariaLabel}
      testId={testId}
      idPrefix="activity-tab"
    />
  );
}
