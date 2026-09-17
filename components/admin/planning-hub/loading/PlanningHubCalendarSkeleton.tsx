"use client";

import { cn } from "@/lib/cn";
import {
  CALENDAR_PLACEHOLDER_BLOCKS,
  type PlannerPlaceholderBlock,
} from "@/lib/planning-hub/loading/deterministic-placeholders";
import styles from "./planning-hub-loading.module.css";

const DAY_LABELS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"] as const;
const TIME_LINES = ["08:00", "12:00", "16:00", "20:00"] as const;

const TINT_CLASS: Record<PlannerPlaceholderBlock["tint"], string> = {
  neutral: "bg-[var(--surface-2)]",
  training: "bg-[var(--sce-training)]/12",
  match: "bg-[var(--sce-match)]/12",
  event: "bg-[var(--sce-event)]/10",
};

type PlanningHubCalendarSkeletonProps = {
  className?: string;
};

export default function PlanningHubCalendarSkeleton({ className }: PlanningHubCalendarSkeletonProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]", className)}
      data-testid="planning-hub-calendar-skeleton"
      aria-hidden
    >
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-[var(--border)]/80">
        <div className="h-9" />
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-9 flex-col items-center justify-center border-l border-[var(--border)]/50 text-[10px] font-semibold tracking-wide text-[var(--text-2)]"
          >
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="relative grid min-h-[420px] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div className="relative border-r border-[var(--border)]/60 py-2">
          {TIME_LINES.map((line) => (
            <div
              key={line}
              className="absolute right-1.5 text-[10px] tabular-nums text-[var(--text-2)]/80"
              style={{ top: `${TIME_LINES.indexOf(line) * 25 + 4}%` }}
            >
              {line}
            </div>
          ))}
        </div>

        {DAY_LABELS.map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="relative border-l border-[var(--border)]/40"
            data-testid={`planning-hub-skeleton-day-${dayIndex}`}
          >
            {TIME_LINES.map((line, i) => (
              <div
                key={line}
                className="pointer-events-none absolute inset-x-0 border-t border-[var(--border)]/35"
                style={{ top: `${i * 25 + 8}%` }}
              />
            ))}

            {CALENDAR_PLACEHOLDER_BLOCKS.filter((b) => b.dayIndex === dayIndex).map((block, i) => (
              <div
                key={`${dayIndex}-${i}`}
                className={cn(
                  "absolute inset-x-1 rounded-md border border-[var(--border)]/50",
                  TINT_CLASS[block.tint],
                  styles.placeholderBlock,
                )}
                style={{
                  top: `${block.topPct}%`,
                  height: `${block.heightPct}%`,
                }}
                data-testid="planning-hub-placeholder-block"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
