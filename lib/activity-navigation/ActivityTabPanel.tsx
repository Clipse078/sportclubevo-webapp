"use client";

import type { ReactNode } from "react";
import type { ActivityTabKey } from "./types";
import SceContextTabPanel from "@/lib/context-tabs/ContextTabPanel";

type Props = {
  tabKey: ActivityTabKey;
  activeTab: ActivityTabKey;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Activity tab panel — delegates to generic SCE Context Tab panel (preserves activity DOM ids).
 */
export default function ActivityTabPanel({
  tabKey,
  activeTab,
  children,
  className,
  testId,
}: Props) {
  return (
    <SceContextTabPanel
      tabKey={tabKey}
      activeTab={activeTab}
      className={className}
      testId={testId}
      idPrefix="activity-tab"
    >
      {children}
    </SceContextTabPanel>
  );
}
