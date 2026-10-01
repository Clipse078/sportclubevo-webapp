import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatSportingActivityScheduleLine } from "@/lib/sporting-activity-presentation/format";

export type SportingActivityScheduleLineProps = {
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  fmtCfg: TenantFormatConfig;
  className?: string;
};

export function SportingActivityScheduleLine({
  startAt,
  endAt,
  allDay,
  fmtCfg,
  className,
}: SportingActivityScheduleLineProps) {
  const label = formatSportingActivityScheduleLine({
    startAt,
    endAt,
    allDay,
    fmtCfg,
  });

  return (
    <p className={className ?? "font-mono text-[0.8125rem] tabular-nums text-[var(--text-2)]"}>
      {label}
    </p>
  );
}
