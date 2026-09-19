import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact layout for personal dashboard cards with no data. */
  variant?: "default" | "compact";
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
  className,
}: DashboardEmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 text-center",
        isCompact ? "py-4 sm:py-4" : "py-7 sm:py-8",
        className,
      )}
    >
      {icon && (
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",
            isCompact ? "h-9 w-9" : "h-11 w-11",
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p
        className={cn(
          "font-semibold text-[var(--foreground)]",
          isCompact ? "text-[0.8125rem]" : "text-[0.875rem]",
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
