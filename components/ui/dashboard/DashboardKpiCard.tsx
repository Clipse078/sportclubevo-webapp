import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardKpiAccent =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "default";

const ACCENT_VARS: Record<
  DashboardKpiAccent,
  { iconBg: string; iconColor: string; subtextColor: string }
> = {
  primary: {
    iconBg: "var(--sce-primary-light)",
    iconColor: "var(--sce-primary)",
    subtextColor: "var(--sce-primary)",
  },
  info: {
    iconBg: "var(--sce-info-light)",
    iconColor: "var(--sce-info)",
    subtextColor: "var(--sce-info)",
  },
  success: {
    iconBg: "var(--sce-success-light)",
    iconColor: "var(--sce-success)",
    subtextColor: "var(--sce-success)",
  },
  warning: {
    iconBg: "var(--sce-warning-light)",
    iconColor: "var(--sce-warning)",
    subtextColor: "var(--sce-warning)",
  },
  danger: {
    iconBg: "var(--sce-danger-light)",
    iconColor: "var(--sce-danger)",
    subtextColor: "var(--sce-danger)",
  },
  default: {
    iconBg: "var(--sce-accent-subtle)",
    iconColor: "var(--sce-accent)",
    subtextColor: "var(--text-2)",
  },
};

export type DashboardKpiCardProps = {
  /** Uppercase metric label. */
  title: string;
  /** Primary numeric or text value. */
  value: string;
  /** Optional icon rendered in the top-right accent chip. */
  icon?: ReactNode;
  /** Supporting text below the value (e.g. trend label or contextual info). */
  description?: string;
  /** Semantic accent variant. No arbitrary colors — design tokens only. */
  accent?: DashboardKpiAccent;
  /** Hero-embedded translucent card for command-center composition. */
  variant?: "default" | "hero";
  /** Optional action rendered below the description. */
  action?: ReactNode;
  className?: string;
};

/**
 * DashboardKpiCard
 *
 * Reusable KPI metric card for dashboard overview strips.
 * Uses only SportClubEvo semantic design tokens — no hardcoded colors.
 *
 * Replaces the legacy KpiCard from components/admin/dashboard/.
 *
 * Usage:
 *   <DashboardKpiCard
 *     title="Offene Anmeldungen"
 *     value="3"
 *     accent="warning"
 *     icon={<Users className="h-5 w-5" />}
 *     description="+2 seit gestern"
 *   />
 */
export function DashboardKpiCard({
  title,
  value,
  icon,
  description,
  accent = "default",
  variant = "default",
  action,
  className,
}: DashboardKpiCardProps) {
  const vars = ACCENT_VARS[accent];
  const isHero = variant === "hero";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border px-4 py-3.5 sm:px-4 sm:py-4",
        isHero
          ? "min-h-[6.25rem] border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] backdrop-blur-[2px] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]"
          : cn(
              "rounded-[var(--radius-xl)] bg-[var(--surface)] sm:px-5",
              "bg-[linear-gradient(145deg,var(--surface)_0%,color-mix(in_srgb,var(--surface)_92%,var(--surface-2))_100%)]",
              "shadow-[var(--shadow-xs)]",
            ),
        "border-[var(--border)]",
        "motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            {title}
          </p>
          <p
            className={cn(
              "mt-1.5 font-bold leading-none tracking-tight text-[var(--foreground)]",
              isHero
                ? "text-[1.625rem] sm:text-[1.75rem]"
                : "mt-2 text-[1.75rem] sm:text-[1.875rem] lg:text-[2rem]",
            )}
          >
            {value}
          </p>
          {description && (
            <p
              className="mt-2 text-[0.75rem] font-medium"
              style={{ color: vars.subtextColor }}
            >
              {description}
            </p>
          )}
          {action && <div className="mt-3">{action}</div>}
        </div>

        {icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[var(--radius-md)]",
              isHero ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-11 sm:w-11",
            )}
            style={{ background: vars.iconBg, color: vars.iconColor }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
