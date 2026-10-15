"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import SceCalendarEngine from "@/components/ui/calendar/SceCalendarEngine";
import type { MonthActivityGridDay } from "@/components/ui/calendar/month-activity-grid-types";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { formatMonthLabel, parseMonthParam } from "@/lib/matchcenter/month-range";
import { groupProgrammeItemsByDay } from "@/lib/programme-engine/programme-day-key";
import {
  buildProgrammeCalendarDayPresentation,
  programmeKindToCalendarSourceType,
} from "@/lib/programme-engine/programme-calendar-presentation";
import type { ProgrammeItem } from "@/lib/programme-engine/types";
import { sortProgrammeItems } from "@/lib/programme-engine/programme-sort";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";
import ProgrammeSceActivityCard from "./ProgrammeSceActivityCard";
import { parseMonthParamToGridDate } from "@/lib/calendar/month-grid";

type Props = {
  items: ProgrammeItem[];
  monthParam: string;
  timeZone: string;
  fmtCfg: TenantFormatConfig;
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

const KIND_ARIA: Record<ProgrammeItem["kind"], string> = {
  TRAINING: "Training",
  MATCH: "Spiel",
  TOURNAMENT: "Turnier",
  CLUB_EVENT: "Veranstaltung",
};

function formatDayHeading(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return format(date, "EEEE, d. MMMM yyyy", { locale: de });
}

function buildDayAccessibleLabel(
  dayKey: string,
  dayItems: ProgrammeItem[],
  flags: { isToday: boolean; isSelected: boolean },
): string {
  const datePart = formatDayHeading(dayKey);
  const parts = [datePart];
  if (flags.isToday) parts.push("Heute");
  if (flags.isSelected) parts.push("Ausgewählt");
  if (dayItems.length === 0) {
    parts.push("Keine Aktivitäten");
  } else {
    const kinds = [...new Set(dayItems.map((item) => KIND_ARIA[item.kind]))];
    parts.push(`${dayItems.length} Aktivitäten (${kinds.join(", ")})`);
  }
  return parts.join(", ");
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
    return buildMonthGridCells(monthParam, timeZone).map((cell) => {
      const { dayKey, dayNumber, inMonth } = cell;
      const dayItems = byDay.get(dayKey) ?? [];
      const isToday = dayKey === todayKey;
      const isSelected = dayKey === selectedDayKey;
      const dayPresentation = buildProgrammeCalendarDayPresentation(dayItems, fmtCfg);

      return {
        dayKey,
        dayNumber,
        inMonth,
        isToday,
        activityCount: dayPresentation.activityCount,
        isSelected,
        accessibleLabel: buildDayAccessibleLabel(dayKey, dayItems, { isToday, isSelected }),
        primarySourceType:
          dayItems.length > 0
            ? programmeKindToCalendarSourceType(sortProgrammeItems(dayItems)[0]!.kind)
            : undefined,
        activityMarkerSourceTypes: dayPresentation.markerSourceTypes,
        sceCalendarEntries: dayPresentation.entries,
        sceCalendarOverflow:
          dayPresentation.overflowCount > 0 ? dayPresentation.overflowCount : undefined,
      };
    });
  }, [byDay, fmtCfg, monthParam, selectedDayKey, timeZone, todayKey]);

  const selectedItems = useMemo(
    () => sortProgrammeItems(byDay.get(selectedDayKey) ?? []),
    [byDay, selectedDayKey],
  );

  const monthHasActivities = useMemo(
    () => days.some((day) => day.inMonth && day.activityCount > 0),
    [days],
  );

  return (
    <div className="space-y-4" data-testid="programme-kalender">
      <SceCalendarEngine
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
        cellVariant="programme"
        showLegend
        dataTestId="programme-month-grid"
      />

      {!monthHasActivities ? (
        <p className="text-sm text-[var(--muted)]" data-testid="programme-kalender-empty-month">
          Keine Aktivitäten in diesem Monat im gewählten Programmzeitraum.
        </p>
      ) : null}

      <section aria-labelledby="programme-kalender-day-heading">
        <h3
          id="programme-kalender-day-heading"
          className="mb-2 text-sm font-semibold capitalize text-[var(--foreground)]"
        >
          {formatDayHeading(selectedDayKey)}
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
                className="rounded-lg border border-[var(--border)]/80 bg-[var(--surface)] p-2 shadow-sm"
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
