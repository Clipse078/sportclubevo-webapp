import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardSectionVariant = "flat" | "card";

export type DashboardSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
  variant?: DashboardSectionVariant;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
};

export function DashboardSection({
  title,
  description,
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
            {title && (
              <h2 className="text-[1.0625rem] font-semibold leading-snug text-[var(--foreground)] sm:text-lg">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-[0.8125rem] text-[var(--text-2)]">{description}</p>
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
