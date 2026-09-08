import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
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

export function DashboardQuickActions({
  actions,
  className,
}: DashboardQuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            "group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 no-underline",
            "transition-[border-color,background-color] duration-[140ms]",
            "hover:border-[color-mix(in_srgb,var(--border-strong)_50%,var(--sce-primary)_50%)]",
            "hover:bg-[var(--surface-2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "bg-[var(--surface-2)] text-[var(--text-2)]",
              "transition-colors duration-[140ms]",
              "group-hover:bg-[color-mix(in_srgb,var(--sce-primary)_12%,var(--surface-2))]",
              "group-hover:text-[var(--sce-primary)]",
            )}
            aria-hidden="true"
          >
            {action.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight text-[var(--foreground)]">
              {action.title}
            </p>
            {action.subtitle && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {action.subtitle}
              </p>
            )}
          </div>
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] opacity-0 transition-[opacity,transform,color] duration-[140ms] group-hover:translate-x-0.5 group-hover:text-[var(--sce-primary)] group-hover:opacity-100"
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
