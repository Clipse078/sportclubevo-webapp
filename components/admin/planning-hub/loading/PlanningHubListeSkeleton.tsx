"use client";

import { cn } from "@/lib/cn";
import { LISTE_ROW_PLACEHOLDER_COUNT } from "@/lib/planning-hub/loading/deterministic-placeholders";
import styles from "./planning-hub-loading.module.css";

type PlanningHubListeSkeletonProps = {
  className?: string;
};

export default function PlanningHubListeSkeleton({ className }: PlanningHubListeSkeletonProps) {
  return (
    <div
      className={cn("space-y-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] p-2", className)}
      data-testid="planning-hub-liste-skeleton"
      aria-hidden
    >
      {Array.from({ length: LISTE_ROW_PLACEHOLDER_COUNT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-[var(--border)]/40 px-2 py-2">
          <div className="h-3 w-10 shrink-0 rounded bg-[var(--surface-2)]" />
          <div
            className={cn("h-8 flex-1 rounded-md bg-[var(--surface-2)]", styles.placeholderBlock)}
            style={{
              maxWidth: `${55 + (i % 4) * 8}%`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
