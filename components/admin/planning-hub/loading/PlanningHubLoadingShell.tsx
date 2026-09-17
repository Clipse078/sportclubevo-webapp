"use client";

import type { PlanningHubPerspective } from "@/lib/planning-hub/planner-url";
import PlanningHubCalendarSkeleton from "./PlanningHubCalendarSkeleton";
import PlanningHubListeSkeleton from "./PlanningHubListeSkeleton";
import PlanningHubLoadingStatus from "./PlanningHubLoadingStatus";
import PlanningHubLoadingTracer from "./PlanningHubLoadingTracer";
import PlanningHubResourceSkeleton from "./PlanningHubResourceSkeleton";
import styles from "./planning-hub-loading.module.css";

export type PlanningHubLoadingShellProps = {
  perspective?: PlanningHubPerspective;
  /** When false, only scheduler region + tracer (chrome already rendered). */
  includeChromeSkeleton?: boolean;
};

function perspectiveSkeleton(perspective: PlanningHubPerspective) {
  switch (perspective) {
    case "ressourcen":
      return <PlanningHubResourceSkeleton />;
    case "liste":
      return <PlanningHubListeSkeleton />;
    case "kalender":
    default:
      return <PlanningHubCalendarSkeleton />;
  }
}

export default function PlanningHubLoadingShell({
  perspective = "kalender",
  includeChromeSkeleton = true,
}: PlanningHubLoadingShellProps) {
  return (
    <div
      className={`space-y-2 ${styles.loadingWorkspace}`}
      data-testid="planning-hub-loading"
      aria-busy="true"
    >
      {includeChromeSkeleton ? (
        <div className="space-y-1 border-b border-[var(--border)] pb-1.5">
          <div className="h-5 w-28 rounded bg-[var(--surface-2)]/80" />
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-md bg-[var(--surface-2)]/70" />
            <div className="h-7 w-44 rounded bg-[var(--surface-2)]/70" />
            <div className="h-7 w-7 rounded-md bg-[var(--surface-2)]/70" />
          </div>
          <div className="h-8 w-full max-w-xl rounded-md bg-[var(--surface-2)]/60" />
        </div>
      ) : null}

      <PlanningHubLoadingTracer />
      <PlanningHubLoadingStatus className="px-0.5 pt-1" />
      {perspectiveSkeleton(perspective)}
    </div>
  );
}
