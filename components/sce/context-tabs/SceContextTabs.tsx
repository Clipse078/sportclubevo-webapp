"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ContextTabId, ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import {
  listKeyboardNavigablePrimaryTabs,
  listVisibleOverflowTabs,
} from "@/lib/context-tabs/registry";
import { useContextDetailTab } from "@/lib/context-tabs/use-context-detail-tab";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs/ContextDirtyNavigationContext";
import {
  SCE_CONTEXT_TABS_NAV_CLASS,
  sceContextTabClassName,
  sceContextTabOverflowSummaryClassName,
} from "@/lib/design-system/sce-context-tabs-foundation";
import { SCE_ACTIVITY_NAV_TABLIST_CLASS } from "@/lib/sce/workspace/sce-workspace-layout";

type Props<TTabId extends ContextTabId = ContextTabId> = {
  config: ContextTabNavigationConfig<TTabId>;
  ariaLabel?: string;
  testId?: string;
  /** DOM id prefix for tab/tabpanel wiring (activity shells use `activity-tab`). */
  idPrefix?: string;
  /** When true, tabs use buttons (composer overlay local state) instead of URL Links. */
  localNavigation?: boolean;
};

function formatTabLabel(label: string, count?: number | string | null): string {
  if (count === null || count === undefined || count === "") {
    return label;
  }
  return `${label} ${count}`;
}

/**
 * SCE-UI-ROLLOUT-01B — universal contextual detail navigation (evolved from SCE-ACTIVITY-NAV-01).
 * URL state via `?tab=`; single-row primary tabs + Mehr overflow.
 */
export default function SceContextTabs<TTabId extends ContextTabId = ContextTabId>({
  config,
  ariaLabel = "Kontext",
  testId = "sce-context-tabs",
  idPrefix = "sce-context-tab",
  localNavigation = false,
}: Props<TTabId>) {
  const { activeTab, navigateToTab, hrefForTab } = useContextDetailTab(config);
  const dirtyNav = useOptionalContextDirtyNavigation();
  const tablistRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const primaryTabs = listKeyboardNavigablePrimaryTabs(config);
  const overflowTabs = listVisibleOverflowTabs(config);
  const overflowActive = overflowTabs.some((tab) => tab.key === activeTab);

  function handleTabClick(event: React.MouseEvent, tabKey: TTabId) {
    if (localNavigation) {
      event.preventDefault();
    }
    if (tabKey === activeTab) {
      return;
    }
    if (dirtyNav?.isDirty || localNavigation) {
      event.preventDefault();
      navigateToTab(tabKey);
    }
  }

  const focusTabAtIndex = useCallback(
    (index: number) => {
      const tab = primaryTabs[index];
      if (!tab) {
        return;
      }
      const tabDomId = `${idPrefix}-${tab.key}`;
      const el = tablistRef.current?.querySelector<HTMLElement>(`#${CSS.escape(tabDomId)}`);
      el?.focus();
    },
    [idPrefix, primaryTabs],
  );

  const activateTabAtIndex = useCallback(
    (index: number) => {
      const tab = primaryTabs[index];
      if (!tab || tab.key === activeTab) {
        focusTabAtIndex(index);
        return;
      }
      navigateToTab(tab.key);
      focusTabAtIndex(index);
    },
    [activeTab, focusTabAtIndex, navigateToTab, primaryTabs],
  );

  useEffect(() => {
    if (!overflowOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOverflowOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [overflowOpen]);

  function handleTablistKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (primaryTabs.length === 0) {
      return;
    }

    const currentIndex = primaryTabs.findIndex((t) => t.key === activeTab);
    const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;

    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (resolvedIndex + 1) % primaryTabs.length;
        break;
      case "ArrowLeft":
        nextIndex = (resolvedIndex - 1 + primaryTabs.length) % primaryTabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = primaryTabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    activateTabAtIndex(nextIndex);
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={SCE_CONTEXT_TABS_NAV_CLASS}
      data-testid={testId}
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={`${ariaLabel} Bereiche`}
        aria-orientation="horizontal"
        onKeyDown={handleTablistKeyDown}
        className={cn(
          SCE_ACTIVITY_NAV_TABLIST_CLASS,
          "-mb-px flex min-h-[2.75rem] min-w-0 max-w-full flex-1 flex-nowrap items-end gap-1",
        )}
      >
        {primaryTabs.map((tab) => {
          const href = hrefForTab(tab.key);
          const isActive = activeTab === tab.key;
          const tabDomId = `${idPrefix}-${tab.key}`;
          const panelDomId = `${idPrefix}panel-${tab.key}`;
          const tabAriaControls = localNavigation ? panelDomId : undefined;

          const tabClassName = sceContextTabClassName(isActive);

          if (localNavigation) {
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={tabDomId}
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls={tabAriaControls}
                data-testid={`${testId}-${tab.key}`}
                onClick={(event) => handleTabClick(event, tab.key)}
                className={tabClassName}
              >
                {formatTabLabel(tab.label, tab.count)}
              </button>
            );
          }

          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              id={tabDomId}
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              aria-controls={tabAriaControls}
              data-testid={`${testId}-${tab.key}`}
              onClick={(event) => handleTabClick(event, tab.key)}
              className={tabClassName}
            >
              {formatTabLabel(tab.label, tab.count)}
            </Link>
          );
        })}
      </div>

      {overflowTabs.length > 0 ? (
        <div
          ref={overflowRef}
          className="relative mb-px flex shrink-0 items-end self-stretch pb-0"
        >
          <button
            type="button"
            className={sceContextTabOverflowSummaryClassName(overflowActive)}
            data-testid={`${testId}-mehr`}
            aria-expanded={overflowOpen}
            aria-haspopup="menu"
            onClick={() => setOverflowOpen((open) => !open)}
          >
            Mehr
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                overflowOpen && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
          {overflowOpen ? (
            <div
              className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-sm"
              role="menu"
            >
              {overflowTabs.map((tab) => {
                const href = hrefForTab(tab.key);
                const isActive = activeTab === tab.key;

                const overflowClassName = cn(
                  "block w-full min-h-[44px] px-3 py-2 text-left text-sm font-medium transition-colors",
                  isActive
                    ? "text-[var(--sce-primary)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                );

                if (localNavigation) {
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="menuitem"
                      data-testid={`${testId}-${tab.key}`}
                      onClick={(event) => {
                        handleTabClick(event, tab.key);
                        setOverflowOpen(false);
                      }}
                      className={overflowClassName}
                    >
                      {formatTabLabel(tab.label, tab.count)}
                    </button>
                  );
                }

                return (
                  <Link
                    key={tab.key}
                    href={href}
                    role="menuitem"
                    data-testid={`${testId}-${tab.key}`}
                    onClick={(event) => {
                      handleTabClick(event, tab.key);
                      setOverflowOpen(false);
                    }}
                    className={overflowClassName}
                  >
                    {formatTabLabel(tab.label, tab.count)}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
