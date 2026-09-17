"use client";

import { cn } from "@/lib/cn";
import styles from "./planning-hub-loading.module.css";

type PlanningHubLoadingRingProps = {
  className?: string;
};

/** ~48px indeterminate SCE orange ring — CSS transform only. */
export default function PlanningHubLoadingRing({ className }: PlanningHubLoadingRingProps) {
  return (
    <div
      className={cn("relative h-12 w-12", className)}
      data-testid="planning-hub-loading-ring"
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 48 48" fill="none">
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="var(--surface-2)"
          strokeWidth="2.5"
          className="opacity-80"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="var(--sce-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 97"
          className={styles.loadingRingArc}
        />
      </svg>
    </div>
  );
}
