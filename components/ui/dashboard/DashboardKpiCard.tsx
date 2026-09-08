import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardKpiAccent =
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "violet"
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
  violet: {
    iconBg: "rgba(129, 140, 248, 0.16)",
    iconColor: "#a5b4fc",
    subtextColor: "#a5b4fc",
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
  title: string;
  value: string;
  icon?: ReactNode;
  description?: string;
  accent?: DashboardKpiAccent;
  variant?: "default" | "hero";
  action?: ReactNode;
  className?: string;
};

/**
 * DashboardKpiCard — KPI metric card with left icon block for command-center hero.
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
        "rounded-[var(--radius-lg)] border",
        isHero
          ? cn(
              "flex min-h-[5.5rem] items-center gap-3 px-3 py-2.5 sm:min-h-[6rem] sm:gap-3.5 sm:px-3.5",
              "border-[color-mix(in_srgb,var(--border)_50%,transparent)]",
              "bg-[color-mix(in_srgb,var(--surface)_42%,transparent)]",
              "shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)]",
              "backdrop-blur-[4px]",
            )
          : cn(
              "rounded-[var(--radius-xl)] bg-[var(--surface)] px-4 py-3.5 sm:px-5 sm:py-4",
              "bg-[linear-gradient(145deg,var(--surface)_0%,color-mix(in_srgb,var(--surface)_92%,var(--surface-2))_100%)]",
              "shadow-[var(--shadow-xs)]",
            ),
        "border-[var(--border)]",
        "motion-safe:transition-[box-shadow,border-color] motion-safe:duration-150",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          isHero ? "h-[3.5rem] w-[3.5rem] sm:h-14 sm:w-14" : "h-10 w-10 sm:h-11 sm:w-11",
        )}
        style={{ background: vars.iconBg, color: vars.iconColor }}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium leading-tight text-[var(--text-2)]",
            isHero ? "text-[0.8125rem]" : "text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]",
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            "font-bold leading-none tracking-tight text-[var(--foreground)]",
            isHero ? "mt-1 text-[1.5rem] sm:text-[1.625rem]" : "mt-2 text-[1.75rem] sm:text-[1.875rem] lg:text-[2rem]",
          )}
        >
          {value}
        </p>
        {description && (
          <p
            className="mt-1.5 text-[0.75rem] font-medium"
            style={{ color: vars.subtextColor }}
          >
            {description}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
