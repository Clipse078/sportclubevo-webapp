"use client";

import { format, isSameDay, isSameMonth } from "date-fns";
import { de } from "date-fns/locale";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import {
  formatMonthLabel,
  parseMonthParam,
  type MatchcenterYearMonth,
} from "@/lib/matchcenter/month-range";
import { buildMonthGridDates, parseMonthParamToGridDate } from "@/lib/calendar/month-grid";
import MonthActivityGrid from "@/components/ui/calendar/MonthActivityGrid";
import type { MonthActivityGridDay } from "@/components/ui/calendar/month-activity-grid-types";

type Props = {
  monthParam: string;
  timezone: string;
  matchDayKeys: readonly string[];
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

function resolveYearMonth(monthParam: string): MatchcenterYearMonth {
  const parsed = parseMonthParam(monthParam);
  if (parsed) return parsed;
  const fallback = parseMonthParamToGridDate(monthParam);
  return { year: fallback.getFullYear(), month: fallback.getMonth() + 1 };
}

export default function SpieleManagementMonthCalendar({
  monthParam,
  timezone,
  matchDayKeys,
  previousMonthHref,
  nextMonthHref,
  todayHref,
}: Props) {
  const matchDayKeySet = new Set(matchDayKeys);
  const monthStart = parseMonthParamToGridDate(monthParam);
  const yearMonth = resolveYearMonth(monthParam);
  const monthLabel = formatMonthLabel(yearMonth, "de-CH", timezone);
  const today = new Date();

  const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const days: MonthActivityGridDay[] = buildMonthGridDates(monthParam).map((day) => {
    const dayKey = matchDayKeyInTimezone(day, timezone);
    const inMonth = isSameMonth(day, monthStart);
    const isToday = isSameDay(day, today);
    const activityCount = matchDayKeySet.has(dayKey) ? 1 : 0;
    const dayLabel = format(day, "d. MMMM yyyy", { locale: de });

    return {
      dayKey,
      dayNumber: format(day, "d"),
      inMonth,
      isToday,
      activityCount,
      isSelected: false,
      accessibleLabel: dayLabel,
    };
  });

  return (
    <MonthActivityGrid
      monthLabel={monthLabel}
      weekdayLabels={weekdayLabels}
      days={days}
      navigation={{
        previousMonthHref,
        nextMonthHref,
        todayHref,
      }}
      ariaLabel="Monatskalender"
      previousMonthLabel="Vorheriger Monat"
      nextMonthLabel="Nächster Monat"
      todayLabel="Heute"
      headingLevel="h3"
      dataTestId="spiele-month-calendar"
      cellVariant="matchcenter"
    />
  );
}
