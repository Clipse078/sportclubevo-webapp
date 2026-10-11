"use client";

import { Suspense, type ReactNode } from "react";
import type { ActivityTabNavigationConfig } from "@/lib/activity-navigation/types";
import { ActivityDetailTabProvider } from "@/lib/activity-navigation/use-activity-detail-tab";
import ActivityDetailNavigation from "./ActivityDetailNavigation";

type Props = {
  config: ActivityTabNavigationConfig;
  ariaLabel?: string;
  testId?: string;
  children: ReactNode;
};

/**
 * Suspense boundary + shared tab state for activity detail workspaces.
 */
export default function ActivityDetailNavigationBoundary({
  config,
  ariaLabel,
  testId,
  children,
}: Props) {
  return (
    <Suspense
      fallback={
        <div
          className="h-11 border-b border-[var(--border)]"
          data-testid={testId ? `${testId}-loading` : "activity-detail-nav-loading"}
        />
      }
    >
      <ActivityDetailTabProvider config={config}>
        <ActivityDetailNavigation ariaLabel={ariaLabel} testId={testId} config={config} />
        {children}
      </ActivityDetailTabProvider>
    </Suspense>
  );
}
