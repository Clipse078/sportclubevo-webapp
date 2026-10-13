"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SceActivityComposerBodyProps = {
  tabsRegion: ReactNode;
  children: ReactNode;
  secondaryPanel?: ReactNode;
  validationAnnouncement?: string | null;
};

export function SceActivityComposerBody({
  tabsRegion,
  children,
  secondaryPanel,
  validationAnnouncement,
}: SceActivityComposerBodyProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 px-5 sm:px-6">{tabsRegion}</div>
      {validationAnnouncement ? (
        <p className="sr-only" role="status" aria-live="polite">
          {validationAnnouncement}
        </p>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1">
        <div
          className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
          data-testid="sce-activity-composer-body"
        >
          {children}
        </div>
        {secondaryPanel ? (
          <aside
            className={cn(
              "hidden min-h-0 w-full max-w-sm shrink-0 overflow-y-auto border-l border-[var(--border)]",
              "bg-[var(--surface)] px-4 py-4 lg:block",
            )}
            data-testid="sce-activity-composer-secondary-panel"
          >
            {secondaryPanel}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
