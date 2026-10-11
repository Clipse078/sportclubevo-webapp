"use client";

import type { ReactNode } from "react";
import type { ActivityTabKey, ActivityTabNavigationConfig } from "./types";
import {
  SceContextTabProvider,
  useContextDetailTab,
  type ContextDetailTabState,
} from "@/lib/context-tabs/use-context-detail-tab";

/** Activity alias for generic context tab provider (URL + dirty guard compatible). */
export function ActivityDetailTabProvider({
  config,
  children,
}: {
  config: ActivityTabNavigationConfig;
  children: ReactNode;
}) {
  return <SceContextTabProvider config={config}>{children}</SceContextTabProvider>;
}

export function useActivityDetailTab(
  config?: ActivityTabNavigationConfig,
): ContextDetailTabState<ActivityTabKey> {
  return useContextDetailTab<ActivityTabKey>(config);
}
