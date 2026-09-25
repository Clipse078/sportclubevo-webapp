import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardCockpitGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Strict 2×2 personal dashboard cockpit on md+; single column on mobile.
 */
export function DashboardCockpitGrid({ children, className }: DashboardCockpitGridProps) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5 md:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:gap-4",
        className,
      )}
      data-testid="dashboard-cockpit-grid"
    >
      {children}
    </div>
  );
}
