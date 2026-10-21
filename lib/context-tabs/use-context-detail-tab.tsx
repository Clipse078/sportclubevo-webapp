"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ContextTabDefinition, ContextTabId, ContextTabNavigationConfig } from "./types";
import { listAllVisibleTabs } from "./registry";
import {
  CONTEXT_TAB_QUERY_PARAM,
  buildContextTabHref,
  readContextTabParam,
  resolveContextTabFromSearchParams,
} from "./url";
import { useOptionalContextDirtyNavigation } from "./ContextDirtyNavigationContext";

export type ContextTabNavigateOptions = {
  /** Guided composer step changes stay in the same draft session — no leave confirm. */
  skipDirtyConfirm?: boolean;
};

export type ContextDetailTabState<TTabId extends ContextTabId = ContextTabId> = {
  activeTab: TTabId;
  visibleTabs: ContextTabDefinition<TTabId>[];
  navigateToTab: (tabKey: TTabId, options?: ContextTabNavigateOptions) => void;
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

/** In-memory tab state for composer overlay (avoids polluting underlying planning URLs). */
export function SceLocalContextTabProvider<TTabId extends ContextTabId>({
  config,
  children,
}: {
  config: ContextTabNavigationConfig<TTabId>;
  children: ReactNode;
}) {
  const value = useLocalContextDetailTabState(config);
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

  const activeTab = useMemo(() => {
    const visibleKeys = visibleTabs
      .filter((t) => t.visible !== false)
      .map((t) => t.key as TTabId);

    if (config.resolveActiveTabFromPathname) {
      const fromPath = config.resolveActiveTabFromPathname(pathname, visibleKeys);
      if (fromPath && visibleKeys.includes(fromPath)) {
        return fromPath;
      }
    }

    const tabQueryParam = config.tabQueryParam ?? CONTEXT_TAB_QUERY_PARAM;
    const rawParam =
      searchParams instanceof URLSearchParams
        ? searchParams.get(tabQueryParam)
        : (() => {
            const raw = searchParams[tabQueryParam];
            if (Array.isArray(raw)) return raw[0] ?? null;
            return raw ?? null;
          })();
    const tabParam = config.resolveTabParam?.(rawParam) ?? rawParam;
    return resolveContextTabFromSearchParams({
      tabParam,
      defaultTab: config.defaultTab,
      visibleTabs,
    });
  }, [config, pathname, searchParams, visibleTabs]);

  const basePath = pathname;

  const hrefForTab = useCallback(
    (tabKey: TTabId) => {
      const routeHref = config.tabRoutes?.[tabKey];
      if (routeHref) {
        return routeHref;
      }

      const tabQueryParam = config.tabQueryParam ?? CONTEXT_TAB_QUERY_PARAM;
      const preserved = new URLSearchParams();
      searchParams.forEach((value, key) => {
        if (key !== CONTEXT_TAB_QUERY_PARAM && key !== tabQueryParam) {
          preserved.set(key, value);
        }
      });
      const url = new URL(basePath, "http://local");
      preserved.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      url.searchParams.set(tabQueryParam, tabKey);
      return `${url.pathname}${url.search}`;
    },
    [basePath, config.tabQueryParam, config.tabRoutes, searchParams],
  );

  const navigateToTab = useCallback(
    (tabKey: TTabId, options?: ContextTabNavigateOptions) => {
      if (tabKey === activeTab) {
        return;
      }
      if (!options?.skipDirtyConfirm && dirtyNav && !dirtyNav.confirmNavigationIfDirty()) {
        return;
      }
      router.push(hrefForTab(tabKey));
    },
    [activeTab, dirtyNav, hrefForTab, router],
  );

  return {
    activeTab,
    visibleTabs,
    navigateToTab,
    hrefForTab,
    config,
  };
}

function useLocalContextDetailTabState<TTabId extends ContextTabId>(
  config: ContextTabNavigationConfig<TTabId>,
): ContextDetailTabState<TTabId> {
  const dirtyNav = useOptionalContextDirtyNavigation();
  const visibleTabs = useMemo(() => listAllVisibleTabs(config), [config]);
  const [activeTab, setActiveTab] = useState<TTabId>(() => config.defaultTab);

  const navigateToTab = useCallback(
    (tabKey: TTabId, options?: ContextTabNavigateOptions) => {
      if (tabKey === activeTab) {
        return;
      }
      if (!options?.skipDirtyConfirm && dirtyNav && !dirtyNav.confirmNavigationIfDirty()) {
        return;
      }
      setActiveTab(tabKey);
    },
    [activeTab, dirtyNav],
  );

  const hrefForTab = useCallback(
    (tabKey: TTabId) => `#sce-local-tab-${String(tabKey)}`,
    [],
  );

  return {
    activeTab,
    visibleTabs,
    navigateToTab,
    hrefForTab,
    config,
  };
}
