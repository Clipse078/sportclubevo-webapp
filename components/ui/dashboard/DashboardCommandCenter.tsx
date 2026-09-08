import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DashboardCommandCenterProps = {
  /** Top-left: Heute im Verein */
  today: ReactNode;
  /** Top-right: Meine Aufgaben */
  tasks: ReactNode;
  /** Bottom-left: Schnellaktionen */
  quickActions: ReactNode;
  /** Bottom-right: Nächste Termine */
  upcoming: ReactNode;
  /** Full-width below grid: Aktuelle Aktivitäten */
  activity?: ReactNode;
  className?: string;
};

/**
 * Command-center grid layout — ~68% main / ~32% secondary on desktop.
 */
export function DashboardCommandCenter({
  today,
  tasks,
  quickActions,
  upcoming,
  activity,
  className,
}: DashboardCommandCenterProps) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          "lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]",
        )}
      >
        {today}
        {tasks}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          "lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]",
        )}
      >
        {quickActions}
        {upcoming}
      </div>

      {activity}
    </div>
  );
}
