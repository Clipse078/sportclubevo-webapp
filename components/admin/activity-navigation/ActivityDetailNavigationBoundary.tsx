"use client";

import { type ReactNode } from "react";
import type { ActivityTabNavigationConfig } from "@/lib/activity-navigation/types";
import SceContextTabsBoundary from "@/components/sce/context-tabs/SceContextTabsBoundary";

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
    <SceContextTabsBoundary
      config={config}
      ariaLabel={ariaLabel}
      testId={testId}
      idPrefix="activity-tab"
    >
      {children}
    </SceContextTabsBoundary>
  );
}
