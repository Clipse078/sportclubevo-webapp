import { cn } from "@/lib/cn";
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

const END_TIME_CLASS: Record<SportingActivityMetaRailDensity, string> = {
  compact: "font-mono text-[0.6875rem] tabular-nums text-[var(--muted)]",
  planner: "font-mono text-[9px] tabular-nums text-[var(--muted)] leading-tight",
  management: "font-mono text-xs tabular-nums text-[var(--muted)]",
};

/**
 * Left metadata column: semantic type pill, then start (and optional end) time.
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
  const showEnd =
    endTimeLabel &&
    endTimeLabel.trim() &&
    endTimeLabel.trim() !== startTimeLabel.trim() &&
    !allDay;

  const timePrimary = allDay ? allDayLabel : startTimeLabel;

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
      <span className={TIME_CLASS[density]} data-testid="sporting-activity-meta-rail-start">
        {timePrimary}
      </span>
      {showEnd ? (
        <span className={END_TIME_CLASS[density]} data-testid="sporting-activity-meta-rail-end">
          {endTimeLabel}
        </span>
      ) : null}
    </div>
  );
}
