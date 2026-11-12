import { SceDateTile } from "@/components/design-system/date";
import { formatSceDateTileParts } from "@/lib/design-system/sce-date-tile";
import { cn } from "@/lib/cn";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type EventDomainMetaRailProps = {
  domainLabel: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  dateStack?: {
    weekdayShort: string;
    day: string;
    monthShort: string;
  };
  dateValue?: Date;
  fmtCfg?: TenantFormatConfig;
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
  dateValue,
  fmtCfg = { locale: "de-CH", timezone: "Europe/Zurich" },
  density = "management",
  className,
}: EventDomainMetaRailProps) {
  const timeRangeLabel = formatSportingActivityTimeRange({
    startLabel: startTimeLabel,
    endLabel: endTimeLabel,
  });

  if (dateValue) {
    const parts = dateStack
      ? { ...dateStack, accessibleLabel: formatSceDateTileParts(dateValue, fmtCfg).accessibleLabel }
      : undefined;
    return (
      <SceDateTile
        value={dateValue}
        fmtCfg={fmtCfg}
        className={className}
        testId="event-domain-meta-rail"
        parts={parts}
      />
    );
  }

  if (dateStack) {
    return (
      <SceDateTile
        value={new Date(`${dateStack.day}.${dateStack.monthShort}`)}
        fmtCfg={fmtCfg}
        className={className}
        testId="event-domain-meta-rail"
        parts={{
          ...dateStack,
          accessibleLabel: `${dateStack.weekdayShort} ${dateStack.day} ${dateStack.monthShort}`,
        }}
      />
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
