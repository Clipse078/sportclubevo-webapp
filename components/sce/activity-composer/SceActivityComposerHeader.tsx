"use client";

import { X } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";
import { ActivityTypePill } from "@/components/sporting-activity/ActivityTypePill";
import { resolveSceActivityComposerSemanticIdentity } from "@/lib/sce/activity-composer/semantic-identity";
import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";

export type SceActivityComposerHeaderProps = {
  activityKind: SceActivityCreateKind;
  title: string;
  description?: string;
  titleId: string;
  descriptionId?: string;
  onClose?: () => void;
  closeLabel?: string;
  presentation: "overlay" | "fullscreen" | "page";
  titleRef?: RefObject<HTMLHeadingElement | null>;
};

export function SceActivityComposerHeader({
  activityKind,
  title,
  description,
  titleId,
  descriptionId,
  onClose,
  closeLabel = "Schließen",
  presentation,
  titleRef,
}: SceActivityComposerHeaderProps) {
  const identity = resolveSceActivityComposerSemanticIdentity(activityKind);

  return (
    <header
      className={cn(
        "flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6",
        presentation === "page" && "bg-[var(--background)]",
      )}
      data-testid="sce-activity-composer-header"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ActivityTypePill activityKind={identity.activityKind} label={identity.typeLabel} />
        </div>
        <h1
          ref={titleRef}
          id={titleId}
          tabIndex={-1}
          className="text-lg font-semibold text-[var(--foreground)] outline-none sm:text-xl"
        >
          {title}
        </h1>
        {description ? (
          <p id={descriptionId} className="text-sm text-[var(--text-2)]">
            {description}
          </p>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-label={closeLabel}
          data-testid="sce-activity-composer-close"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </header>
  );
}
