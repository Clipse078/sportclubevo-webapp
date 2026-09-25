import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact layout for personal dashboard cards with no data. */
  variant?: "default" | "compact" | "cockpit";
  /**
   * With `variant="compact"`, `inline` places icon beside the title (personal cards).
   * Default stacked compact keeps centered icon + text (other dashboard sections).
   */
  compactLayout?: "stacked" | "inline";
  className?: string;
};

/**
 * Centered empty state for dashboard sections with no data.
 */
export function DashboardEmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  compactLayout = "stacked",
  className,
}: DashboardEmptyStateProps) {
  const isCockpit = variant === "cockpit";
  const isCompact = variant === "compact" || isCockpit;
  const isInlineCompact = isCompact && compactLayout === "inline" && !isCockpit;

  return (
    <div
      className={cn(
        isCockpit
          ? "flex flex-col items-start gap-2 pt-1 text-left sm:pt-2"
          : isInlineCompact
            ? "flex flex-row items-center gap-2 py-0.5 text-left"
            : "flex flex-col items-center gap-2.5 text-center",
        !isInlineCompact && !isCockpit && (isCompact ? "py-3 sm:py-3" : "py-7 sm:py-8"),
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
            isCockpit
              ? "h-9 w-9"
              : isInlineCompact
                ? "h-8 w-8"
                : isCompact
                  ? "h-9 w-9"
                  : "h-11 w-11",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div
        className={cn(
          (isInlineCompact || isCockpit) && "min-w-0 flex-1",
          !isInlineCompact && !isCockpit && "flex flex-col items-center gap-1",
          isCockpit && "flex flex-col items-start gap-0.5",
        )}
      >
        <p
          className={cn(
            "font-semibold text-[var(--foreground)]",
            isCompact ? "text-[0.8125rem]" : "text-[0.875rem]",
          )}
        >
          {title}
        </p>
        {description && (
          <p
            className={cn(
              "text-[0.8125rem] leading-relaxed text-[var(--muted)]",
              isCockpit
                ? "max-w-md text-left"
                : isInlineCompact
                  ? "mt-0.5"
                  : "max-w-sm text-center",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
