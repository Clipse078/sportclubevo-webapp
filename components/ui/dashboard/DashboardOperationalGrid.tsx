import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardOperationalGridProps = {
  /** Heute im Verein + Benötigt Aufmerksamkeit */
  operationalRow: ReactNode;
  /** Meine Agenda + Meine Aufgaben */
  personalRow: ReactNode;
  tertiary?: ReactNode;
  className?: string;
};

/**
 * Command-center composition: club operations first, personal modules second.
 */
export function DashboardOperationalGrid({
  operationalRow,
  personalRow,
  tertiary,
  className,
}: DashboardOperationalGridProps) {
  return (
    <div className={cn("flex flex-col gap-4 lg:gap-5", className)}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {operationalRow}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        {personalRow}
      </div>
      {tertiary}
    </div>
  );
}
