import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type QuickActionStripItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export type DashboardQuickActionStripProps = {
  actions: QuickActionStripItem[];
  className?: string;
};

/** Compact permission-aware create shortcuts for the dashboard cockpit. */
export function DashboardQuickActionStrip({
  actions,
  className,
}: DashboardQuickActionStripProps) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "inline-flex min-h-[2rem] items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)]",
            "bg-[var(--surface)] px-2.5 py-1 text-[0.8125rem] font-medium text-[var(--foreground)] no-underline",
            "motion-safe:transition-[background-color,border-color] motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          )}
        >
          <span className="text-[var(--sce-primary)]" aria-hidden="true">
            +
          </span>
          <span className="text-[var(--muted)]" aria-hidden="true">
            {action.icon}
          </span>
          {action.label}
        </Link>
      ))}
    </div>
  );
}
