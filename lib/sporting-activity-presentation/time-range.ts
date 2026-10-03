import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import { formatTime } from "@/lib/tenant-runtime/formatters";

/** En dash between start and end — canonical SCE sporting activity time range separator. */
export const SPORTING_ACTIVITY_TIME_RANGE_SEPARATOR = "–";

export type FormatSportingActivityTimeRangeInput = {
  startLabel?: string | null;
  endLabel?: string | null;
};

/**
 * Canonical HH:mm or HH:mm–HH:mm presentation for sporting activities and shared event rails.
 * Never fabricates an end time; never renders placeholders such as "17:00–?" or "17:00–".
 */
export function formatSportingActivityTimeRange(
  input: FormatSportingActivityTimeRangeInput,
): string | undefined {
  const start = input.startLabel?.trim();
  if (!start) {
    return undefined;
  }

  const end = input.endLabel?.trim();
  if (!end || end === start) {
    return start;
  }

  return `${start}${SPORTING_ACTIVITY_TIME_RANGE_SEPARATOR}${end}`;
}

export function formatSportingActivityTimeRangeFromDates(input: {
  startAt: Date;
  endAt?: Date | null;
  fmtCfg?: TenantFormatConfig;
}): string | undefined {
  const startLabel = formatTime(input.startAt, input.fmtCfg ?? {});
  if (!input.endAt) {
    return startLabel;
  }
  const endLabel = formatTime(input.endAt, input.fmtCfg ?? {});
  return formatSportingActivityTimeRange({ startLabel, endLabel });
}
