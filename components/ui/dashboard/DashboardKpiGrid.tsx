import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DashboardKpiCard, type DashboardKpiAccent } from "./DashboardKpiCard";

export type DashboardKpiGridItem = {
  key: string;
  label: string;
  value: string;
  description?: string;
  accent?: DashboardKpiAccent;
  icon?: ReactNode;
};

export type DashboardKpiGridProps = {
  items: DashboardKpiGridItem[];
  /** Hero-embedded KPI cards inside DashboardHero. */
  variant?: "default" | "hero";
  className?: string;
};

/**
 * Premium KPI card grid — replaces the flat metric strip for command-center dashboards.
 */
export function DashboardKpiGrid({
  items,
  variant = "default",
  className,
}: DashboardKpiGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4",
        className,
      )}
    >
      {items.map((item) => (
        <DashboardKpiCard
          key={item.key}
          title={item.label}
          value={item.value}
          description={item.description}
          accent={item.accent}
          icon={item.icon}
          variant={variant}
          className={cn(
            variant === "default" &&
              "motion-safe:transition-[box-shadow,border-color,transform] motion-safe:duration-150 motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[var(--shadow-sm)] motion-safe:hover:border-[var(--border-strong)]",
          )}
        />
      ))}
    </div>
  );
}
