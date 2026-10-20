"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SceEmptyStateVariant } from "@/lib/design-system/sce-feedback-status-foundation";

export type SceEmptyStateProps = {
  variant?: SceEmptyStateVariant;
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Alias for filter reset — rendered like primary when alone. */
  action?: ReactNode;
  layout?: "centered" | "compact-inline" | "compact-stacked" | "cockpit";
  className?: string;
  "data-testid"?: string;
};

export function SceEmptyState({
  variant = "NO_DATA",
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  action,
  layout = "centered",
  className,
  "data-testid": testId,
}: SceEmptyStateProps) {
  const resolvedPrimary = primaryAction ?? action;
  const isCockpit = layout === "cockpit";
  const isInline = layout === "compact-inline";
  const isCompact = isInline || layout === "compact-stacked" || isCockpit;

  return (
    <div
      data-sce-empty-state={variant}
      data-testid={testId}
      className={cn(
        isCockpit
          ? "flex flex-col items-start gap-2 pt-1 text-left sm:pt-2"
          : isInline
            ? "flex flex-row items-center gap-2 py-0.5 text-left"
            : "flex flex-col items-center gap-2.5 text-center",
        !isInline && !isCockpit && (isCompact ? "py-3 sm:py-3" : "px-6 py-12"),
        className,
      )}
      role="status"
    >
      {icon ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-[var(--muted)]",
            layout === "centered"
              ? "h-16 w-16 rounded-2xl bg-[var(--sce-accent-subtle)] text-[var(--sce-accent)]"
              : "h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)]",
            isInline && "h-8 w-8",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      <div
        className={cn(
          (isInline || isCockpit) && "min-w-0 flex-1",
          !isInline && !isCockpit && "flex max-w-sm flex-col items-center gap-1.5",
          isCockpit && "flex flex-col items-start gap-0.5",
        )}
      >
        <p
          className={cn(
            "font-semibold text-[var(--foreground)]",
            isCompact ? "text-[0.8125rem]" : "text-sm",
          )}
        >
          {title}
        </p>
        {description ? (
          <p
            className={cn(
              "text-[0.8125rem] leading-relaxed text-[var(--text-2)]",
              isCockpit ? "max-w-md text-left" : isInline ? "mt-0.5" : "text-center",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {(resolvedPrimary || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", isCockpit && "justify-start")}>
          {resolvedPrimary}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
