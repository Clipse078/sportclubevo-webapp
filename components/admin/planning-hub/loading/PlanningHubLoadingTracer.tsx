"use client";

import styles from "./planning-hub-loading.module.css";

type PlanningHubLoadingTracerProps = {
  className?: string;
};

/** 2px indeterminate SCE orange rail — no fake percentages. */
export default function PlanningHubLoadingTracer({ className }: PlanningHubLoadingTracerProps) {
  return (
    <div
      className={className}
      data-testid="planning-hub-loading-tracer"
      role="progressbar"
      aria-valuetext="Wochenplanung wird geladen"
      aria-busy="true"
    >
      <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-[var(--sce-primary)]/10">
        <div
          className={`absolute inset-y-0 left-0 w-[28%] rounded-full bg-gradient-to-r from-transparent via-[var(--sce-primary)] to-transparent ${styles.tracerSegment}`}
        />
      </div>
    </div>
  );
}
