"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ActivityTabKey, ActivityTabNavigationConfig } from "./types";
import { listAllVisibleTabs } from "./configs";
import { buildActivityTabHref, readActivityTabParam, resolveActivityTabFromSearchParams } from "./url";
import { useOptionalActivityDirtyNavigation } from "./ActivityDirtyNavigationContext";

type ActivityDetailTabContextValue = ReturnType<typeof useActivityDetailTabState>;

const ActivityDetailTabContext = createContext<ActivityDetailTabContextValue | null>(null);

export function ActivityDetailTabProvider({
  config,
  children,
}: {
  config: ActivityTabNavigationConfig;
  children: ReactNode;
}) {
  const value = useActivityDetailTabState(config);
  return (
    <ActivityDetailTabContext.Provider value={value}>{children}</ActivityDetailTabContext.Provider>
  );
}

export function useActivityDetailTab(config?: ActivityTabNavigationConfig) {
  const ctx = useContext(ActivityDetailTabContext);
  if (ctx) {
    return ctx;
  }
  if (!config) {
    throw new Error("useActivityDetailTab requires config outside ActivityDetailTabProvider");
  }
  return useActivityDetailTabState(config);
}

function useActivityDetailTabState(config: ActivityTabNavigationConfig) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dirtyNav = useOptionalActivityDirtyNavigation();

  const visibleTabs = useMemo(() => listAllVisibleTabs(config), [config]);

  const activeTab = useMemo(
    () =>
      resolveActivityTabFromSearchParams({
        tabParam: readActivityTabParam(searchParams),
        defaultTab: config.defaultTab,
        visibleTabs,
      }),
    [config.defaultTab, searchParams, visibleTabs],
  );

  const basePath = pathname;

  const navigateToTab = useCallback(
    (tabKey: ActivityTabKey) => {
      if (tabKey === activeTab) {
        return;
      }
      if (dirtyNav && !dirtyNav.confirmNavigationIfDirty()) {
        return;
      }
      const href = buildActivityTabHref(basePath, tabKey);
      router.push(href);
    },
    [activeTab, basePath, dirtyNav, router],
  );

  const hrefForTab = useCallback(
    (tabKey: ActivityTabKey) => buildActivityTabHref(basePath, tabKey),
    [basePath],
  );

  return {
    activeTab,
    visibleTabs,
    navigateToTab,
    hrefForTab,
    config,
  };
}
