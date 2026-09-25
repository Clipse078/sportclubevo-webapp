import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { DashboardSectionIconAccent } from "./DashboardSection";
import {
  dashboardCockpitSurfaceClassName,
  DASHBOARD_COCKPIT_CARD_MIN_HEIGHT,
} from "@/lib/dashboard/dashboard-cockpit-surface";

const ICON_ACCENTS: Record<
  DashboardSectionIconAccent,
  { bg: string; color: string }
> = {
  primary: { bg: "var(--sce-primary-light)", color: "var(--sce-primary)" },
  info: { bg: "var(--sce-info-light)", color: "var(--sce-info)" },
  success: { bg: "var(--sce-success-light)", color: "var(--sce-success)" },
  warning: { bg: "var(--sce-warning-light)", color: "var(--sce-warning)" },
  violet: { bg: "rgba(129, 140, 248, 0.16)", color: "#a5b4fc" },
  danger: { bg: "var(--sce-danger-light)", color: "var(--sce-danger)" },
  default: { bg: "var(--surface-2)", color: "var(--muted)" },
};

export type DashboardCockpitCardProps = {
  title: string;
  titleId?: string;
  icon?: ReactNode;
  iconAccent?: DashboardSectionIconAccent;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Mobile stack order (1 = Mein Programm …). */
  orderClassName?: string;
};

export function DashboardCockpitCard({
  title,
  titleId,
  icon,
  iconAccent = "primary",
  headerAction,
  footer,
  children,
  className,
  bodyClassName,
  orderClassName,
}: DashboardCockpitCardProps) {
  const palette = ICON_ACCENTS[iconAccent];

  return (
    <article
      className={cn(
        dashboardCockpitSurfaceClassName,
        DASHBOARD_COCKPIT_CARD_MIN_HEIGHT,
        "flex h-full min-w-0 flex-col",
        orderClassName,
        className,
      )}
      data-testid="dashboard-cockpit-card"
      aria-labelledby={titleId}
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-3.5 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
              style={{ backgroundColor: palette.bg, color: palette.color }}
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          <h2
            id={titleId}
            className="text-[0.9375rem] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-base"
          >
            {title}
          </h2>
        </div>
        {headerAction ? (
          <div className="flex shrink-0 items-center pt-0.5">{headerAction}</div>
        ) : null}
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden px-3.5 py-2.5 sm:px-4 sm:py-3",
          bodyClassName,
        )}
      >
        {children}
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-[color-mix(in_srgb,var(--border)_55%,transparent)] px-3.5 py-2 sm:px-4">
          {footer}
        </footer>
      ) : null}
    </article>
  );
}
