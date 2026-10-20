"use client";

import type { ReactNode } from "react";
import {
  FilterX,
  Lock,
  PackageOpen,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
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
  /** When true, empty state lives inside the owning functional surface (list/panel). */
  contained?: boolean;
  className?: string;
  "data-testid"?: string;
};

function defaultVariantIcon(variant: SceEmptyStateVariant): ReactNode {
  const className = "h-[1.125rem] w-[1.125rem]";
  switch (variant) {
    case "FIRST_USE":
      return <Sparkles className={className} aria-hidden />;
    case "FILTERED_NO_RESULTS":
    case "NO_RESULTS":
      return <Search className={className} aria-hidden />;
    case "NOT_CONFIGURED":
      return <Settings2 className={className} aria-hidden />;
    case "NOT_AVAILABLE":
      return <PackageOpen className={className} aria-hidden />;
    case "PERMISSION_LIMITED":
      return <Lock className={className} aria-hidden />;
    case "NO_DATA":
    default:
      return <FilterX className={className} aria-hidden />;
  }
}

export function SceEmptyState({
  variant = "NO_DATA",
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  action,
  layout = "centered",
  contained = false,
  className,
  "data-testid": testId,
}: SceEmptyStateProps) {
  const resolvedPrimary = primaryAction ?? action;
  const resolvedIcon = icon ?? defaultVariantIcon(variant);
  const isCockpit = layout === "cockpit";
  const isInline = layout === "compact-inline";
  const isCompact = isInline || layout === "compact-stacked" || isCockpit;
  const useContainedStack = contained || isCompact;

  const body = (
    <>
      {resolvedIcon ? (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-[var(--muted)]",
            layout === "centered" && !contained
              ? "h-11 w-11 rounded-xl bg-[var(--sce-accent-subtle)] text-[var(--sce-accent)]"
              : "h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)]",
            isInline && "h-8 w-8",
            (variant === "FILTERED_NO_RESULTS" || variant === "NO_RESULTS") &&
              useContainedStack &&
              "text-[var(--sce-primary)]",
          )}
          aria-hidden="true"
          data-sce-empty-state-icon
        >
          {resolvedIcon}
        </span>
      ) : null}

      <div
        className={cn(
          (isInline || isCockpit || (contained && layout === "compact-stacked")) && "min-w-0 flex-1",
          !isInline && !isCockpit && !contained && "flex max-w-sm flex-col items-center gap-1.5",
          isCockpit && "flex flex-col items-start gap-0.5",
          contained && layout === "compact-stacked" && "flex flex-col items-start gap-1",
        )}
      >
        <p
          className={cn(
            "font-semibold text-[var(--foreground)]",
            isCompact ? "text-[0.8125rem] sm:text-sm" : "text-sm",
            contained && layout === "compact-stacked" && "text-sm",
          )}
        >
          {title}
        </p>
        {description ? (
          <p
            className={cn(
              "text-[0.8125rem] leading-relaxed text-[var(--text-2)]",
              isCockpit || (contained && layout === "compact-stacked")
                ? "max-w-md text-left"
                : isInline
                  ? "mt-0.5"
                  : "text-center",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {(resolvedPrimary || secondaryAction) && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2",
            !isInline && !contained && "justify-center",
            (isCockpit || (contained && layout === "compact-stacked")) && "justify-start pt-1",
          )}
        >
          {resolvedPrimary}
          {secondaryAction}
        </div>
      )}
    </>
  );

  return (
    <div
      data-sce-empty-state={variant}
      data-sce-empty-contained={contained ? "yes" : "no"}
      data-testid={testId}
      className={cn(
        contained &&
          "w-full rounded-none border-0 bg-transparent shadow-none",
        isCockpit
          ? "flex flex-col items-start gap-2 pt-1 text-left sm:pt-2"
          : isInline
            ? "flex flex-row items-center gap-2 py-0.5 text-left"
            : contained && layout === "compact-stacked"
              ? "flex flex-col items-start gap-3 px-5 py-8 text-left sm:px-6 sm:py-10"
              : "flex flex-col items-center gap-2.5 text-center",
        !isInline && !isCockpit && !contained && (isCompact ? "py-3 sm:py-3" : "px-6 py-10 sm:py-12"),
        className,
      )}
      role="status"
    >
      {body}
    </div>
  );
}
