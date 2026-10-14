"use client";

import type { ReactNode } from "react";
import {
  SCE_ACTIVITY_COMPOSER_BODY_SCROLL_TEST_ID,
  SCE_SCROLL_REGION_DARK_CLASS,
} from "@/lib/sce/activity-composer/composer-layout";
import type { SceActivityComposerResolvedPresentation } from "@/lib/sce/activity-composer/types";
import { cn } from "@/lib/cn";

export type SceActivityComposerBodyProps = {
  presentation: SceActivityComposerResolvedPresentation;
  tabsRegion: ReactNode;
  children: ReactNode;
  secondaryPanel?: ReactNode;
  validationAnnouncement?: string | null;
};

export function SceActivityComposerBody({
  presentation,
  tabsRegion,
  children,
  secondaryPanel,
  validationAnnouncement,
}: SceActivityComposerBodyProps) {
  const isBoundedWorkspace = presentation === "overlay" || presentation === "fullscreen";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        isBoundedWorkspace && "min-h-0 flex-1",
      )}
      data-testid="sce-activity-composer-body-region"
    >
      <div className="shrink-0 px-5 sm:px-6">{tabsRegion}</div>
      {validationAnnouncement ? (
        <p
          role="alert"
          aria-live="polite"
          className="mx-5 mt-2 rounded-lg border border-[var(--sce-danger)]/30 bg-[var(--sce-danger)]/10 px-3 py-2 text-sm text-[var(--sce-danger)] sm:mx-6"
          data-testid="sce-activity-composer-validation-banner"
        >
          {validationAnnouncement}
        </p>
      ) : null}
      <div
        className={cn(
          "flex min-w-0",
          isBoundedWorkspace && "min-h-0 flex-1",
        )}
      >
        <div
          className={cn(
            "min-w-0 flex-1 px-5 py-4 sm:px-6 sm:py-5",
            isBoundedWorkspace &&
              cn(
                "min-h-0 overflow-y-auto",
                SCE_SCROLL_REGION_DARK_CLASS,
              ),
          )}
          data-testid={SCE_ACTIVITY_COMPOSER_BODY_SCROLL_TEST_ID}
          data-composer-scroll={isBoundedWorkspace ? "internal" : "document"}
        >
          {children}
        </div>
        {secondaryPanel ? (
          <aside
            className={cn(
              "hidden w-full max-w-sm shrink-0 border-l border-[var(--border)]",
              "bg-[var(--surface)] px-4 py-4 lg:block",
              isBoundedWorkspace &&
                cn("min-h-0 overflow-y-auto", SCE_SCROLL_REGION_DARK_CLASS),
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
