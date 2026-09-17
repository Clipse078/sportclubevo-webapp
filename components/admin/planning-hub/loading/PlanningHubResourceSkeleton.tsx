"use client";

import { cn } from "@/lib/cn";
import { RESOURCE_ROW_PLACEHOLDER_COUNT } from "@/lib/planning-hub/loading/deterministic-placeholders";
import styles from "./planning-hub-loading.module.css";

type PlanningHubResourceSkeletonProps = {
  className?: string;
};

export default function PlanningHubResourceSkeleton({ className }: PlanningHubResourceSkeletonProps) {
  return (
    <div
      className={cn("space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2", className)}
      data-testid="planning-hub-resource-skeleton"
      aria-hidden
    >
      {Array.from({ length: RESOURCE_ROW_PLACEHOLDER_COUNT }).map((_, row) => (
        <div key={row} className="grid grid-cols-[8rem_1fr] gap-2">
          <div className="h-8 rounded bg-[var(--surface-2)]" />
          <div className="relative h-8 rounded border border-[var(--border)]/50 bg-[var(--surface-2)]/40">
            <div
              className={cn(
                "absolute inset-y-1 rounded-md border border-[var(--border)]/40 bg-[var(--surface-2)]",
                styles.placeholderBlock,
              )}
              style={{
                left: `${12 + row * 4}%`,
                width: `${22 + (row % 3) * 6}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
