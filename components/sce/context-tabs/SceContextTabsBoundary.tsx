"use client";

import { Suspense, type ReactNode } from "react";
import type { ContextTabId, ContextTabNavigationConfig } from "@/lib/context-tabs/types";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import SceContextTabs from "./SceContextTabs";

type Props<TTabId extends ContextTabId = ContextTabId> = {
  config: ContextTabNavigationConfig<TTabId>;
  ariaLabel?: string;
  testId?: string;
  idPrefix?: string;
  children: ReactNode;
};

/**
 * Suspense boundary + shared tab state for contextual detail workspaces.
 */
export default function SceContextTabsBoundary<TTabId extends ContextTabId = ContextTabId>({
  config,
  ariaLabel,
  testId,
  idPrefix,
  children,
}: Props<TTabId>) {
  return (
    <Suspense
      fallback={
        <div
          className="h-11 border-b border-[var(--border)]"
          data-testid={testId ? `${testId}-loading` : "sce-context-tabs-loading"}
        />
      }
    >
      <SceContextTabProvider config={config}>
        <SceContextTabs
          ariaLabel={ariaLabel}
          testId={testId}
          config={config}
          idPrefix={idPrefix}
        />
        {children}
      </SceContextTabProvider>
    </Suspense>
  );
}
