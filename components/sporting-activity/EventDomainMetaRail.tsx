import { cn } from "@/lib/cn";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";

export type EventDomainMetaRailProps = {
  domainLabel: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  dateStack?: {
    weekdayShort: string;
    day: string;
    monthShort: string;
  };
  density?: "compact" | "management";
  className?: string;
};

/**
 * Non-sporting event metadata rail (Veranstaltungen) — shared spacing with activity rail.
 */
export function EventDomainMetaRail({
  domainLabel,
  startTimeLabel,
  endTimeLabel,
  dateStack,
  density = "management",
  className,
}: EventDomainMetaRailProps) {
  const timeRangeLabel = formatSportingActivityTimeRange({
    startLabel: startTimeLabel,
    endLabel: endTimeLabel,
  });

  if (dateStack) {
    return (
      <div
        className={cn(
          "flex w-[4.75rem] shrink-0 flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1.5 text-center",
          className,
        )}
        data-testid="event-domain-meta-rail"
      >
        <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {dateStack.weekdayShort}
        </span>
        <span className="text-xl font-bold leading-none text-[var(--foreground)]">{dateStack.day}</span>
        <span className="text-[0.6rem] font-semibold uppercase text-[var(--text-2)]">
          {dateStack.monthShort}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex shrink-0 flex-col items-end gap-0.5 text-right", className)}
      data-testid="event-domain-meta-rail"
    >
      <span className="inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-[var(--text-2)]">
        {domainLabel}
      </span>
      {timeRangeLabel ? (
        <time
          className={cn(
            "whitespace-nowrap font-mono font-semibold tabular-nums text-[var(--foreground)]",
            density === "compact" ? "text-[0.8125rem]" : "text-sm",
          )}
          data-testid="event-domain-meta-rail-time"
        >
          {timeRangeLabel}
        </time>
      ) : null}
    </div>
  );
}
