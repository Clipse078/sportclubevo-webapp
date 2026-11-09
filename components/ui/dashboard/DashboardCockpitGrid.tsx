import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardCockpitGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Personal dashboard cockpit — full-width programme on md+, attention/tasks row below.
 */
export function DashboardCockpitGrid({ children, className }: DashboardCockpitGridProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5 md:[grid-template-columns:repeat(2,minmax(0,1fr))] md:[grid-template-rows:minmax(clamp(14rem,30vh,24rem),auto)_minmax(clamp(12rem,26vh,20rem),auto)] lg:gap-4",
        className,
      )}
      data-testid="dashboard-cockpit-grid"
    >
      {children}
    </div>
  );
}
