import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DashboardKpiAccent } from "./DashboardKpiCard";

export type QuickActionAccent = Extract<
  DashboardKpiAccent,
  "primary" | "info" | "success" | "violet" | "warning" | "default"
>;

const QUICK_ACTION_ACCENTS: Record<
  QuickActionAccent,
  { iconBg: string; iconColor: string }
> = {
  primary: {
    iconBg: "var(--sce-primary-light)",
    iconColor: "var(--sce-primary)",
  },
  info: {
    iconBg: "var(--sce-info-light)",
    iconColor: "var(--sce-info)",
  },
  success: {
    iconBg: "var(--sce-success-light)",
    iconColor: "var(--sce-success)",
  },
  violet: {
    iconBg: "rgba(129, 140, 248, 0.16)",
    iconColor: "#a5b4fc",
  },
  warning: {
    iconBg: "var(--sce-warning-light)",
    iconColor: "var(--sce-warning)",
  },
  default: {
    iconBg: "var(--sce-accent-subtle)",
    iconColor: "var(--sce-accent)",
  },
};

export type QuickAction = {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  accent?: QuickActionAccent;
};

export type DashboardQuickActionsProps = {
  actions: QuickAction[];
  className?: string;
};

/**
 * Command-center quick action tiles — horizontal row with semantic icon accents.
 */
export function DashboardQuickActions({
  actions,
  className,
}: DashboardQuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3",
        className,
      )}
    >
      {actions.map((action) => {
        const accent = QUICK_ACTION_ACCENTS[action.accent ?? "primary"];

        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "group flex min-h-[4.5rem] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 no-underline sm:min-h-[5.25rem] sm:px-4",
              "motion-safe:transition-[background-color,border-color,box-shadow,transform] motion-safe:duration-150",
              "motion-safe:hover:-translate-y-px motion-safe:hover:border-[var(--border-strong)] motion-safe:hover:bg-[var(--surface-2)] motion-safe:hover:shadow-[var(--shadow-sm)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                "motion-safe:transition-colors motion-safe:duration-150",
              )}
              style={{ background: accent.iconBg, color: accent.iconColor }}
              aria-hidden="true"
            >
              {action.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.875rem] font-semibold leading-tight text-[var(--foreground)]">
                {action.title}
              </p>
              {action.subtitle && (
                <p className="mt-0.5 line-clamp-1 text-[0.75rem] leading-snug text-[var(--muted)]">
                  {action.subtitle}
                </p>
              )}
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-[var(--muted)] motion-safe:transition-colors motion-safe:duration-150 group-hover:text-[var(--sce-primary)]"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}
