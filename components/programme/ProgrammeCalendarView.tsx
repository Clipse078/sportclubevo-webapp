"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import MonthActivityGrid from "@/components/ui/calendar/MonthActivityGrid";
import type { MonthActivityGridDay } from "@/components/ui/calendar/month-activity-grid-types";
import { buildMonthGridDates, parseMonthParamToGridDate } from "@/lib/calendar/month-grid";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { formatMonthLabel, parseMonthParam } from "@/lib/matchcenter/month-range";
import { groupProgrammeItemsByDay } from "@/lib/programme-engine/programme-day-key";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import ProgrammeSceActivityCard from "./ProgrammeSceActivityCard";
import { isSameMonth } from "date-fns";

type Props = {
  items: ProgrammeItem[];
  monthParam: string;
  timeZone: string;
  fmtCfg: TenantFormatConfig;
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

const KIND_LABEL: Record<ProgrammeItem["kind"], string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  CLUB_EVENT: "Veranstaltung",
};

function buildDayAriaLabel(dayKey: string, dayItems: ProgrammeItem[]): string {
  const parts = dayItems.map((item) => KIND_LABEL[item.kind]);
  const unique = [...new Set(parts)];
  return `${dayKey}: ${dayItems.length} Aktivitäten (${unique.join(", ")})`;
}

export default function ProgrammeCalendarView({
  items,
  monthParam,
  timeZone,
  fmtCfg,
  previousMonthHref,
  nextMonthHref,
  todayHref,
}: Props) {
  const monthStart = parseMonthParamToGridDate(monthParam);
  const yearMonth =
    parseMonthParam(monthParam) ?? {
      year: monthStart.getFullYear(),
      month: monthStart.getMonth() + 1,
    };
  const monthLabel = formatMonthLabel(yearMonth, fmtCfg.locale ?? "de-CH", timeZone);
  const todayKey = matchDayKeyInTimezone(new Date(), timeZone);

  const byDay = useMemo(() => groupProgrammeItemsByDay(items, timeZone), [items, timeZone]);

  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const handleSelectDay = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
  }, []);

  const days: MonthActivityGridDay[] = useMemo(() => {
    return buildMonthGridDates(monthParam).map((day) => {
      const dayKey = matchDayKeyInTimezone(day, timeZone);
      const dayItems = byDay.get(dayKey) ?? [];
      return {
        dayKey,
        dayNumber: format(day, "d"),
        inMonth: isSameMonth(day, monthStart),
        isToday: dayKey === todayKey,
        activityCount: dayItems.length,
        isSelected: dayKey === selectedDayKey,
        accessibleLabel: buildDayAriaLabel(dayKey, dayItems),
      };
    });
  }, [byDay, monthParam, monthStart, selectedDayKey, timeZone, todayKey]);

  const selectedItems = byDay.get(selectedDayKey) ?? [];

  return (
    <div className="space-y-4" data-testid="programme-kalender">
      <MonthActivityGrid
        monthLabel={monthLabel}
        weekdayLabels={["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]}
        days={days}
        navigation={{
          previousMonthHref,
          nextMonthHref,
          todayHref,
        }}
        ariaLabel="Programm Monatskalender"
        previousMonthLabel="Vorheriger Monat"
        nextMonthLabel="Nächster Monat"
        todayLabel="Heute"
        selectable
        onSelectDay={handleSelectDay}
        cellVariant="personal"
        showLegend
        dataTestId="programme-month-grid"
      />

      <section aria-labelledby="programme-kalender-day-heading">
        <h3
          id="programme-kalender-day-heading"
          className="mb-2 text-sm font-semibold text-[var(--foreground)]"
        >
          {selectedDayKey}
        </h3>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-[var(--muted)]" data-testid="programme-kalender-day-empty">
            Keine Aktivitäten an diesem Tag.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] p-2"
              >
                <ProgrammeSceActivityCard item={item} fmtCfg={fmtCfg} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
