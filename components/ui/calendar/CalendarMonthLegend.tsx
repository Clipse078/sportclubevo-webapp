"use client";

import { useTranslations } from "next-intl";
import { CalendarActivityMarkerDot } from "./CalendarActivityMarkers";
import { cn } from "@/lib/cn";
import type { SceCalendarLegendEntry } from "@/lib/calendar/sce-calendar-engine";

export type CalendarMonthLegendProps = {
  className?: string;
  compact?: boolean;
  entries?: readonly SceCalendarLegendEntry[];
  "data-testid"?: string;
};

export function CalendarMonthLegend({
  className,
  compact = false,
  entries: entriesProp,
  "data-testid": dataTestId = "personal-calendar-month-legend",
}: CalendarMonthLegendProps) {
  const t = useTranslations("PersonalDashboard.calendar");

  const entries =
    entriesProp ??
    ([
      { sourceType: "TRAINING" as const, label: t("legendTraining") },
      { sourceType: "MATCH" as const, label: t("legendMatch") },
      { sourceType: "TOURNAMENT" as const, label: t("legendTournament") },
      { sourceType: "EVENT" as const, label: t("legendEvent") },
    ] satisfies readonly SceCalendarLegendEntry[]);

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] text-[var(--text-2)]",
        compact && "gap-x-2",
        className,
      )}
      aria-label={t("legendAria")}
      data-testid={dataTestId}
      data-sce-calendar-region="legend"
    >
      {entries.map(({ sourceType, label }) => (
        <li key={sourceType} className="inline-flex list-none items-center gap-1">
          {sourceType === "TASK" ? (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted)]"
              aria-hidden
              data-legend-task
            />
          ) : (
            <CalendarActivityMarkerDot sourceType={sourceType} className="h-1.5 w-1.5" />
          )}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
