import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardOperationalGridProps = {
  /** Meine Agenda + Meine Aufgaben — personal cockpit first on desktop. */
  personalRow: ReactNode;
  /** Heute im Verein (primary club-wide column on desktop). */
  clubToday: ReactNode;
  /** Benötigt Aufmerksamkeit (secondary column on desktop; before Heute on mobile). */
  clubAttention: ReactNode;
  tertiary?: ReactNode;
  className?: string;
};

/**
 * Command-center composition: personal modules first, then club operations.
 */
export function DashboardOperationalGrid({
  personalRow,
  clubToday,
  clubAttention,
  tertiary,
  className,
}: DashboardOperationalGridProps) {
  return (
    <div className={cn("flex flex-col gap-3.5 lg:gap-4", className)}>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-4">
        {personalRow}
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1.62fr)_minmax(0,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 lg:order-1">{clubToday}</div>
        <div className="order-1 min-w-0 lg:order-2">{clubAttention}</div>
      </div>
      {tertiary}
    </div>
  );
}
