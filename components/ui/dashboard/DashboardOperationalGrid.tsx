import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardOperationalGridProps = {
  primaryRow: ReactNode;
  secondaryRow: ReactNode;
  tertiary?: ReactNode;
  className?: string;
};

/**
 * Two-row operational layout: personal content first, club context second.
 */
export function DashboardOperationalGrid({
  primaryRow,
  secondaryRow,
  tertiary,
  className,
}: DashboardOperationalGridProps) {
  return (
    <div className={cn("flex flex-col gap-5 lg:gap-6", className)}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {primaryRow}
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-flow-row-dense lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {secondaryRow}
      </div>
      {tertiary}
    </div>
  );
}
