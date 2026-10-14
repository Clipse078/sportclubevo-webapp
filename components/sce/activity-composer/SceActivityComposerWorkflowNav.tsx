"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useCallback, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { ContextTabId, ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import { listKeyboardNavigablePrimaryTabs } from "@/lib/context-tabs/registry";
import { useContextDetailTab } from "@/lib/context-tabs/use-context-detail-tab";
import { useOptionalContextDirtyNavigation } from "@/lib/context-tabs/ContextDirtyNavigationContext";
import {
  resolveGuidedStepIndex,
  resolveGuidedStepVisualState,
  type SceActivityGuidedStepVisualState,
} from "@/lib/sce/activity-composer/guided-workflow";

type Props<TTabId extends ContextTabId = ContextTabId> = {
  config: ContextTabNavigationConfig<TTabId>;
  orderedTabKeys: readonly TTabId[];
  tabErrors?: Partial<Record<TTabId, boolean>>;
  /** 01E-R6 — when set, overrides legacy completion inference. */
  resolveStepVisualState?: (stepKey: TTabId) => SceActivityGuidedStepVisualState;
  /** @deprecated Prefer `resolveStepVisualState` (01E-R6). */
  resolveStepComplete?: (stepKey: TTabId) => boolean;
  finalReviewTab?: TTabId;
  ariaLabel?: string;
  testId?: string;
  idPrefix?: string;
  localNavigation?: boolean;
};

function stripErrorMarker(label: string): string {
  return label.replace(/\s•\s*$/, "").trim();
}

function StepIndicator({
  state,
}: {
  state: SceActivityGuidedStepVisualState;
}) {
  if (state === "completed") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--foreground)]"
        aria-hidden
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--sce-primary)] bg-[var(--sce-primary)]"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--background)]" />
      </span>
    );
  }
  if (state === "error") {
    return (
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--sce-danger)] text-[10px] font-bold leading-none text-[var(--sce-danger)]"
        aria-hidden
      >
        !
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-transparent"
      aria-hidden
    />
  );
}

/**
 * Guided workflow navigation — still backed by Context Tabs state (`?tab=` / local).
 */
export default function SceActivityComposerWorkflowNav<TTabId extends ContextTabId = ContextTabId>({
  config,
  orderedTabKeys,
  tabErrors,
  resolveStepVisualState,
  resolveStepComplete,
  finalReviewTab,
  ariaLabel = "Erstellungsworkflow",
  testId = "sce-activity-composer-workflow",
  idPrefix = "sce-activity-composer-tab",
  localNavigation = false,
}: Props<TTabId>) {
  const { activeTab, navigateToTab, hrefForTab } = useContextDetailTab(config);
  const dirtyNav = useOptionalContextDirtyNavigation();
  const tablistRef = useRef<HTMLDivElement>(null);

  const primaryTabs = listKeyboardNavigablePrimaryTabs(config);
  const stepIndex = resolveGuidedStepIndex(orderedTabKeys, activeTab);
  const stepTotal = orderedTabKeys.length;
  const currentLabel =
    primaryTabs.find((t) => t.key === activeTab)?.label ?? activeTab;

  function handleTabClick(event: React.MouseEvent, tabKey: TTabId) {
    if (localNavigation) {
      event.preventDefault();
    }
    if (tabKey === activeTab) {
      return;
    }
    if (dirtyNav?.isDirty || localNavigation) {
      event.preventDefault();
      navigateToTab(tabKey, { skipDirtyConfirm: true });
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
      navigateToTab(tab.key, { skipDirtyConfirm: true });
      focusTabAtIndex(index);
    },
    [activeTab, focusTabAtIndex, navigateToTab, primaryTabs],
  );

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
    <div
      className="space-y-2 border-b border-[var(--border)] pb-3 pt-1"
      data-testid={testId}
    >
      <p
        className="text-xs font-medium uppercase tracking-wide text-[var(--text-2)]"
        data-testid={`${testId}-progress-label`}
      >
        Schritt {stepIndex + 1} von {stepTotal}
      </p>

      <p className="text-sm font-semibold text-[var(--foreground)] md:hidden" aria-live="polite">
        {stripErrorMarker(String(currentLabel))}
      </p>

      <nav aria-label={ariaLabel} className="min-w-0">
        <div
          ref={tablistRef}
          role="tablist"
          aria-label={`${ariaLabel} Schritte`}
          aria-orientation="horizontal"
          onKeyDown={handleTablistKeyDown}
          className={cn(
            "flex min-w-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "max-md:snap-x max-md:snap-mandatory",
          )}
        >
          {primaryTabs.map((tab) => {
            const href = hrefForTab(tab.key);
            const isActive = activeTab === tab.key;
            const tabDomId = `${idPrefix}-${tab.key}`;
            const panelDomId = `${idPrefix}panel-${tab.key}`;
            const visualState =
              resolveStepVisualState?.(tab.key) ??
              resolveGuidedStepVisualState({
                tabKey: tab.key,
                activeTab,
                orderedTabKeys,
                tabErrors,
                stepComplete: resolveStepComplete?.(tab.key),
                finalReviewTab,
              });
            const cleanLabel = stripErrorMarker(tab.label);

            const tabClassName = cn(
              "flex min-w-[5.5rem] shrink-0 snap-start flex-col items-center gap-1 rounded-lg px-2 py-2 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
              isActive
                ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                : "text-[var(--text-2)] hover:bg-[var(--surface-2)]/60 hover:text-[var(--foreground)]",
              visualState === "error" && !isActive && "text-[var(--sce-danger)]",
            );

            const stepButtonInner = (
              <>
                <StepIndicator state={visualState} />
                <span className="max-w-[7rem] text-[11px] font-semibold leading-tight sm:text-xs">
                  {cleanLabel}
                </span>
              </>
            );

            if (localNavigation) {
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={tabDomId}
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-current={isActive ? "step" : undefined}
                  aria-controls={panelDomId}
                  data-testid={`sce-activity-composer-tabs-${tab.key}`}
                  data-guided-step-state={visualState}
                  onClick={(event) => handleTabClick(event, tab.key)}
                  className={tabClassName}
                >
                  {stepButtonInner}
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
                aria-current={isActive ? "step" : undefined}
                aria-controls={panelDomId}
                data-testid={`sce-activity-composer-tabs-${tab.key}`}
                data-guided-step-state={visualState}
                onClick={(event) => handleTabClick(event, tab.key)}
                className={tabClassName}
              >
                {stepButtonInner}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
