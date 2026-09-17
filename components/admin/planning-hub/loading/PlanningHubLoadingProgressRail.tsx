"use client";

import { cn } from "@/lib/cn";
import styles from "./planning-hub-loading.module.css";

type PlanningHubLoadingProgressRailProps = {
  className?: string;
};

/** Indeterminate progress rail — no fake percentages. */
export default function PlanningHubLoadingProgressRail({
  className,
}: PlanningHubLoadingProgressRailProps) {
  return (
    <div
      className={cn("w-full max-w-[22rem] sm:max-w-[23.5rem]", className)}
      data-testid="planning-hub-loading-progress-rail"
      role="progressbar"
      aria-valuetext="Wochenplaner wird geladen"
      aria-busy="true"
    >
      <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-[var(--surface-2)]/90">
        <div className={`absolute inset-y-0 left-0 w-[32%] rounded-full ${styles.progressRailSegment}`} />
      </div>
    </div>
  );
}
