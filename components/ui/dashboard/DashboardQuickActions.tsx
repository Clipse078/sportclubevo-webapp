import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type QuickAction = {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
};

export type DashboardQuickActionsProps = {
  actions: QuickAction[];
  className?: string;
};

/**
 * Compact command action tiles with icon, label, and supporting text.
 */
export function DashboardQuickActions({
  actions,
  className,
}: DashboardQuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2.5 sm:grid-cols-2",
        className,
      )}
    >
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)]/50 px-3.5 py-3 no-underline sm:px-4",
            "motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-150",
            "motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)] motion-safe:hover:shadow-[var(--shadow-xs)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
              "bg-[var(--sce-primary-light)] text-[var(--sce-primary)]",
              "motion-safe:transition-colors motion-safe:duration-150",
              "group-hover:bg-[color-mix(in_srgb,var(--sce-primary-light)_80%,var(--sce-primary)_20%)]",
            )}
            aria-hidden="true"
          >
            {action.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[0.875rem] font-semibold leading-tight text-[var(--foreground)]">
              {action.title}
            </p>
            {action.subtitle && (
              <p className="mt-0.5 text-[0.75rem] leading-snug text-[var(--muted)]">
                {action.subtitle}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
