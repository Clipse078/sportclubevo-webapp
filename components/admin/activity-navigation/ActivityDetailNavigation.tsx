"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActivityTabNavigationConfig } from "@/lib/activity-navigation/types";
import {
  listVisibleOverflowTabs,
  listVisiblePrimaryTabs,
} from "@/lib/activity-navigation/configs";
import { useActivityDetailTab } from "@/lib/activity-navigation/use-activity-detail-tab";
import { useOptionalActivityDirtyNavigation } from "@/lib/activity-navigation/ActivityDirtyNavigationContext";
import type { ActivityTabKey } from "@/lib/activity-navigation/types";

type Props = {
  config: ActivityTabNavigationConfig;
  ariaLabel?: string;
  testId?: string;
};

function formatTabLabel(label: string, count?: number | string | null): string {
  if (count === null || count === undefined || count === "") {
    return label;
  }
  return `${label} ${count}`;
}

/**
 * SCE-ACTIVITY-NAV-01 — shared horizontal activity detail navigation.
 * Visual language aligned with TeamCockpitNav; URL state via `?tab=`.
 */
export default function ActivityDetailNavigation({
  config,
  ariaLabel = "Aktivität",
  testId = "activity-detail-nav",
}: Props) {
  const { activeTab, navigateToTab, hrefForTab } = useActivityDetailTab();
  const dirtyNav = useOptionalActivityDirtyNavigation();

  const primaryTabs = listVisiblePrimaryTabs(config);
  const overflowTabs = listVisibleOverflowTabs(config);
  const overflowActive = overflowTabs.some((tab) => tab.key === activeTab);

  function handleTabClick(event: React.MouseEvent, tabKey: ActivityTabKey) {
    if (tabKey === activeTab) {
      return;
    }
    if (dirtyNav?.isDirty) {
      event.preventDefault();
      navigateToTab(tabKey);
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex items-end gap-3 border-b border-[var(--border)]"
      data-testid={testId}
    >
      <div
        role="tablist"
        aria-label={`${ariaLabel} Bereiche`}
        className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-thin"
      >
        {primaryTabs.map((tab) => {
          const href = hrefForTab(tab.key);
          const isActive = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={href}
              role="tab"
              id={`activity-tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`activity-tabpanel-${tab.key}`}
              data-testid={`${testId}-${tab.key}`}
              onClick={(event) => handleTabClick(event, tab.key)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
                isActive
                  ? "border-[var(--sce-primary)] text-[var(--sce-primary)]"
                  : "border-transparent text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
            >
              {formatTabLabel(tab.label, tab.count)}
            </Link>
          );
        })}
      </div>

      {overflowTabs.length > 0 ? (
        <div className="relative shrink-0 pb-2.5">
          <details className="group relative">
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center gap-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors marker:content-none [&::-webkit-details-marker]:hidden",
                overflowActive
                  ? "text-[var(--sce-primary)]"
                  : "text-[var(--text-2)] hover:text-[var(--foreground)]",
              )}
              data-testid={`${testId}-mehr`}
            >
              Mehr
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div
              className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-sm"
              role="menu"
            >
              {overflowTabs.map((tab) => {
                const href = hrefForTab(tab.key);
                const isActive = activeTab === tab.key;

                return (
                  <Link
                    key={tab.key}
                    href={href}
                    role="menuitem"
                    data-testid={`${testId}-${tab.key}`}
                    onClick={(event) => handleTabClick(event, tab.key)}
                    className={cn(
                      "block px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "text-[var(--sce-primary)]"
                        : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {formatTabLabel(tab.label, tab.count)}
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      ) : null}
    </nav>
  );
}
