import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { DashboardKpiAccent } from "./DashboardKpiCard";

export type DashboardSectionVariant = "flat" | "card";

export type DashboardSectionIconAccent = DashboardKpiAccent;

export type DashboardSectionProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  iconAccent?: DashboardSectionIconAccent;
  actions?: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
  variant?: DashboardSectionVariant;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
};

const SECTION_ICON_ACCENTS: Record<
  DashboardSectionIconAccent,
  { bg: string; color: string }
> = {
  primary: {
    bg: "var(--sce-primary-light)",
    color: "var(--sce-primary)",
  },
  info: {
    bg: "var(--sce-info-light)",
    color: "var(--sce-info)",
  },
  success: {
    bg: "var(--sce-success-light)",
    color: "var(--sce-success)",
  },
  warning: {
    bg: "var(--sce-warning-light)",
    color: "var(--sce-warning)",
  },
  violet: {
    bg: "rgba(129, 140, 248, 0.16)",
    color: "#a5b4fc",
  },
  danger: {
    bg: "var(--sce-danger-light)",
    color: "var(--sce-danger)",
  },
  default: {
    bg: "var(--surface-2)",
    color: "var(--muted)",
  },
};

function DashboardSectionIcon({
  icon,
  accent = "info",
}: {
  icon: ReactNode;
  accent?: DashboardSectionIconAccent;
}) {
  const palette = SECTION_ICON_ACCENTS[accent];

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
      style={{ backgroundColor: palette.bg, color: palette.color }}
      aria-hidden="true"
    >
      {icon}
    </span>
  );
}

export function DashboardSection({
  title,
  description,
  icon,
  iconAccent = "info",
  actions,
  footer,
  noPadding = false,
  variant = "flat",
  className,
  bodyClassName,
  children,
}: DashboardSectionProps) {
  const hasHeader = !!(title || description || actions);
  const isCard = variant === "card";

  return (
    <section
      className={cn(
        isCard &&
          "overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)]",
        isCard &&
          "bg-[linear-gradient(180deg,var(--surface)_0%,color-mix(in_srgb,var(--surface)_97%,var(--surface-2))_100%)]",
        className,
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex items-start justify-between gap-3",
            isCard ? "border-b border-[color-mix(in_srgb,var(--border)_90%,transparent)] px-4 py-3.5 sm:px-5" : "pb-2.5",
          )}
        >
          <div className="min-w-0 flex-1">
            {(title || icon) && (
              <div className="flex items-start gap-2.5">
                {icon && <DashboardSectionIcon icon={icon} accent={iconAccent} />}
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 className="text-[1.0625rem] font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{description}</p>
                  )}
                </div>
              </div>
            )}
            {!title && !icon && description && (
              <p className="text-[0.8125rem] text-[var(--text-2)]">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>
          )}
        </div>
      )}

      {children !== undefined && (
        <div className={cn(!noPadding && (isCard ? "px-4 py-3.5" : "py-1"), bodyClassName)}>
          {children}
        </div>
      )}

      {footer && (
        <div
          className={cn(
            "pt-2",
            isCard && "border-t border-[color-mix(in_srgb,var(--border)_90%,transparent)] px-4 py-3 sm:px-5",
          )}
        >
          {footer}
        </div>
      )}
    </section>
  );
}
