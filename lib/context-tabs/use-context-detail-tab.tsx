"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ContextTabDefinition, ContextTabId, ContextTabNavigationConfig } from "./types";
import { listAllVisibleTabs } from "./registry";
import {
  buildContextTabHref,
  readContextTabParam,
  resolveContextTabFromSearchParams,
} from "./url";
import { useOptionalContextDirtyNavigation } from "./ContextDirtyNavigationContext";

export type ContextDetailTabState<TTabId extends ContextTabId = ContextTabId> = {
  activeTab: TTabId;
  visibleTabs: ContextTabDefinition<TTabId>[];
  navigateToTab: (tabKey: TTabId) => void;
  hrefForTab: (tabKey: TTabId) => string;
  config: ContextTabNavigationConfig<TTabId>;
};

const ContextDetailTabContext = createContext<ContextDetailTabState | null>(null);

export function SceContextTabProvider<TTabId extends ContextTabId>({
  config,
  children,
}: {
  config: ContextTabNavigationConfig<TTabId>;
  children: ReactNode;
}) {
  const value = useContextDetailTabState(config);
  return (
    <ContextDetailTabContext.Provider value={value as unknown as ContextDetailTabState}>
      {children}
    </ContextDetailTabContext.Provider>
  );
}

export function useContextDetailTab<TTabId extends ContextTabId>(
  config?: ContextTabNavigationConfig<TTabId>,
): ContextDetailTabState<TTabId> {
  const ctx = useContext(ContextDetailTabContext);
  if (ctx) {
    return ctx as unknown as ContextDetailTabState<TTabId>;
  }
  if (!config) {
    throw new Error("useContextDetailTab requires config outside SceContextTabProvider");
  }
  return useContextDetailTabState(config);
}

function useContextDetailTabState<TTabId extends ContextTabId>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextDetailTabState<TTabId> {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dirtyNav = useOptionalContextDirtyNavigation();

  const visibleTabs = useMemo(() => listAllVisibleTabs(config), [config]);

  const activeTab = useMemo(
    () =>
      resolveContextTabFromSearchParams({
        tabParam: readContextTabParam(searchParams),
        defaultTab: config.defaultTab,
        visibleTabs,
      }),
    [config.defaultTab, searchParams, visibleTabs],
  );

  const basePath = pathname;

  const navigateToTab = useCallback(
    (tabKey: TTabId) => {
      if (tabKey === activeTab) {
        return;
      }
      if (dirtyNav && !dirtyNav.confirmNavigationIfDirty()) {
        return;
      }
      const href = buildContextTabHref(basePath, tabKey);
      router.push(href);
    },
    [activeTab, basePath, dirtyNav, router],
  );

  const hrefForTab = useCallback(
    (tabKey: TTabId) => buildContextTabHref(basePath, tabKey),
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
