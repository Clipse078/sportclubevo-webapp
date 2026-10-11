"use client";

import type { ReactNode } from "react";
import type { ActivityTabKey } from "./types";
import { cn } from "@/lib/cn";

type Props = {
  tabKey: ActivityTabKey;
  activeTab: ActivityTabKey;
  children: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Keeps tab panel content mounted while hidden so editor local state survives tab switches.
 */
export default function ActivityTabPanel({
  tabKey,
  activeTab,
  children,
  className,
  testId,
}: Props) {
  const isActive = tabKey === activeTab;

  return (
    <section
      role="tabpanel"
      id={`activity-tabpanel-${tabKey}`}
      aria-labelledby={`activity-tab-${tabKey}`}
      hidden={!isActive}
      aria-hidden={!isActive}
      className={cn(!isActive && "hidden", className)}
      data-testid={testId ?? `activity-tabpanel-${tabKey}`}
    >
      {children}
    </section>
  );
}
