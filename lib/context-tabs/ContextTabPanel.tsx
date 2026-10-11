"use client";

import type { ReactNode } from "react";
import type { ContextTabId } from "./types";
import { cn } from "@/lib/cn";

type Props<TTabId extends ContextTabId = ContextTabId> = {
  tabKey: TTabId;
  activeTab: TTabId;
  children: ReactNode;
  className?: string;
  testId?: string;
  /** Prefix for tab/tabpanel DOM ids (`${idPrefix}-${tabKey}`). */
  idPrefix?: string;
};

/**
 * Context tab panel — keeps content mounted while hidden (form state survives tab switches).
 */
export default function SceContextTabPanel<TTabId extends ContextTabId = ContextTabId>({
  tabKey,
  activeTab,
  children,
  className,
  testId,
  idPrefix = "sce-context-tab",
}: Props<TTabId>) {
  const isActive = tabKey === activeTab;
  const tabDomId = `${idPrefix}-${tabKey}`;
  const panelDomId = `${idPrefix}panel-${tabKey}`;

  return (
    <section
      role="tabpanel"
      id={panelDomId}
      aria-labelledby={tabDomId}
      hidden={!isActive}
      aria-hidden={!isActive}
      className={cn(!isActive && "hidden", className)}
      data-testid={testId ?? `${idPrefix}panel-${tabKey}`}
    >
      {children}
    </section>
  );
}
