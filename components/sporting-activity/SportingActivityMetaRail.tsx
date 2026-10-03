import { cn } from "@/lib/cn";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import { ActivityTypePill } from "./ActivityTypePill";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";

export type SportingActivityMetaRailDensity = "compact" | "planner" | "management";

export type SportingActivityMetaRailProps = {
  activityKind?: SportingActivityKind;
  typeLabel?: string;
  startTimeLabel: string;
  endTimeLabel?: string;
  allDay?: boolean;
  allDayLabel?: string;
  density?: SportingActivityMetaRailDensity;
  className?: string;
};

const TIME_CLASS: Record<SportingActivityMetaRailDensity, string> = {
  compact: "font-mono text-[0.8125rem] font-semibold tabular-nums text-[var(--text-2)]",
  planner: "font-mono text-[10px] font-semibold tabular-nums text-[var(--text-2)] leading-tight",
  management: "font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]",
};

/**
 * Left metadata column: semantic type pill, then canonical start–end time (single unit).
 */
export function SportingActivityMetaRail({
  activityKind,
  typeLabel,
  startTimeLabel,
  endTimeLabel,
  allDay = false,
  allDayLabel = "Ganztägig",
  density = "compact",
  className,
}: SportingActivityMetaRailProps) {
  const timeRangeLabel = allDay
    ? allDayLabel
    : formatSportingActivityTimeRange({
        startLabel: startTimeLabel,
        endLabel: endTimeLabel,
      }) ?? startTimeLabel;

  return (
    <div
      className={cn("flex shrink-0 flex-col items-end gap-0.5 text-right", className)}
      data-testid="sporting-activity-meta-rail"
    >
      {activityKind && typeLabel ? (
        <ActivityTypePill activityKind={activityKind} label={typeLabel} />
      ) : typeLabel ? (
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
          {typeLabel}
        </span>
      ) : null}
      <time
        className={TIME_CLASS[density]}
        data-testid="sporting-activity-meta-rail-time"
        dateTime={timeRangeLabel.includes("–") ? undefined : timeRangeLabel}
      >
        {timeRangeLabel}
      </time>
    </div>
  );
}
