import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
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
  className,
}: DashboardEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 py-7 text-center sm:py-8",
        className,
      )}
    >
      {icon && (
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="text-[0.875rem] font-semibold text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="max-w-sm text-[0.8125rem] leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
