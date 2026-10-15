import {
  formatSportingActivityTimeRangeFromDates,
  splitSportingActivityTimeRangeLabel,
} from "@/lib/sporting-activity-presentation/time-range";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export type CalendarMicroTimeSemanticKind = "ACTIVITY" | "TASK";

export type FormatCalendarMicroTimeLabelInput = {
  allDay: boolean;
  startAt: Date;
  endAt?: Date | null;
  fmtCfg: TenantFormatConfig;
  semanticKind?: CalendarMicroTimeSemanticKind;
};

function resolveMeaningfulEndInstant(startAt: Date, endAt?: Date | null): Date | null {
  if (!endAt) return null;
  if (Number.isNaN(endAt.getTime())) return null;
  if (endAt.getTime() <= startAt.getTime()) return null;
  return endAt;
}

/**
 * Canonical month-grid MICRO time grammar (visual): start only, start–end, Ganztägig, or task Fällig.
 * Never fabricates an end time from defaults or assumed duration.
 */
export function formatCalendarMicroTimeLabel(input: FormatCalendarMicroTimeLabelInput): string {
  if (input.semanticKind === "TASK" && input.allDay) {
    return "Fällig";
  }
  if (input.allDay) {
    return "Ganztägig";
  }

  const endAt = resolveMeaningfulEndInstant(input.startAt, input.endAt);
  return (
    formatSportingActivityTimeRangeFromDates({
      startAt: input.startAt,
      endAt,
      fmtCfg: input.fmtCfg,
    }) ?? ""
  );
}

/** Screen-reader phrasing for MICRO time (e.g. «18:45 bis 20:15»). */
export function formatCalendarMicroAccessibleTimePhrase(visualTimeLabel: string): string {
  const trimmed = visualTimeLabel.trim();
  if (!trimmed || trimmed === "Ganztägig" || trimmed === "Fällig") {
    return trimmed;
  }

  const { startLabel, endLabel } = splitSportingActivityTimeRangeLabel(trimmed);
  if (endLabel && endLabel !== "?" && endLabel !== startLabel) {
    return `${startLabel} bis ${endLabel}`;
  }
  return startLabel || trimmed;
}
