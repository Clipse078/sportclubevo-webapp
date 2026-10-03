"use client";

import { useTranslations } from "next-intl";
import { CalendarActivityMarkerDot } from "./CalendarActivityMarkers";
import { cn } from "@/lib/cn";

export type CalendarMonthLegendProps = {
  className?: string;
  compact?: boolean;
};

export function CalendarMonthLegend({ className, compact = false }: CalendarMonthLegendProps) {
  const t = useTranslations("PersonalDashboard.calendar");

  const entries = [
    { type: "TRAINING" as const, label: t("legendTraining") },
    { type: "MATCH" as const, label: t("legendMatch") },
    { type: "TOURNAMENT" as const, label: t("legendTournament") },
    { type: "EVENT" as const, label: t("legendEvent") },
  ];

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.625rem] text-[var(--text-2)]",
        compact && "gap-x-2",
        className,
      )}
      aria-label={t("legendAria")}
      data-testid="personal-calendar-month-legend"
    >
      {entries.map(({ type, label }) => (
        <li key={type} className="inline-flex list-none items-center gap-1">
          <CalendarActivityMarkerDot sourceType={type} className="h-1.5 w-1.5" />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
