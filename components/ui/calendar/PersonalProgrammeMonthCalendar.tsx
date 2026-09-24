"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { formatMonthLabel, parseMonthParam } from "@/lib/matchcenter/month-range";
import {
  buildMonthGridCells,
  parseMonthParamToGridDate,
} from "@/lib/calendar/month-grid";
import { groupPersonalProgrammeItemsByDay } from "@/lib/personal-agenda/programme-day-key";
import { sortPersonalProgrammeItems } from "@/lib/personal-agenda/programme-sort";
import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import { cn } from "@/lib/cn";
import MonthActivityGrid from "./MonthActivityGrid";
import type { MonthActivityGridDay, MonthActivityGridNavigation } from "./month-activity-grid-types";

export type PersonalProgrammeMonthCalendarProps = {
  monthParam: string;
  timeZone: string;
  items: PersonalProgrammeItem[];
  /** Controlled selected tenant-local day key (yyyy-MM-dd). */
  selectedDayKey?: string;
  /** Notifies parent for DASHBOARD-06 programme coordination. */
  onSelectedDayChange?: (dayKey: string) => void;
  navigation: MonthActivityGridNavigation;
  /** Defaults to tenant-local today when omitted. */
  todayDayKey?: string;
  className?: string;
  headingLevel?: "h2" | "h3";
  showSelectedDayPanel?: boolean;
  /** Optional override for dot/aria counts (e.g. tasks on full Kalender page). Programme list still uses `items`. */
  activityCountByDay?: ReadonlyMap<string, number>;
};

function defaultTodayKey(timeZone: string, now = new Date()): string {
  return matchDayKeyInTimezone(now, timeZone);
}

export default function PersonalProgrammeMonthCalendar({
  monthParam,
  timeZone,
  items,
  selectedDayKey: selectedDayKeyProp,
  onSelectedDayChange,
  navigation,
  todayDayKey,
  className,
  headingLevel = "h2",
  showSelectedDayPanel = true,
  activityCountByDay,
}: PersonalProgrammeMonthCalendarProps) {
  const t = useTranslations("PersonalDashboard.calendar");
  const monthStart = parseMonthParamToGridDate(monthParam);
  const yearMonth =
    parseMonthParam(monthParam) ?? {
      year: monthStart.getFullYear(),
      month: monthStart.getMonth() + 1,
    };
  const monthLabel = formatMonthLabel(yearMonth, "de-CH", timeZone);

  const todayKey = todayDayKey ?? defaultTodayKey(timeZone);
  const [uncontrolledSelected, setUncontrolledSelected] = useState(todayKey);
  const selectedDayKey = selectedDayKeyProp ?? uncontrolledSelected;

  const handleSelectDay = useCallback(
    (dayKey: string) => {
      if (selectedDayKeyProp == null) {
        setUncontrolledSelected(dayKey);
      }
      onSelectedDayChange?.(dayKey);
    },
    [onSelectedDayChange, selectedDayKeyProp],
  );

  const itemsByDay = useMemo(
    () => groupPersonalProgrammeItemsByDay(items, timeZone),
    [items, timeZone],
  );

  const weekdayLabels = useMemo(
    () => [
      t("weekdayMon"),
      t("weekdayTue"),
      t("weekdayWed"),
      t("weekdayThu"),
      t("weekdayFri"),
      t("weekdaySat"),
      t("weekdaySun"),
    ],
    [t],
  );

  const gridDays: MonthActivityGridDay[] = useMemo(() => {
    return buildMonthGridCells(monthParam, timeZone).map((cell) => {
      const { dayKey, dayNumber, inMonth } = cell;
      const dayItems = itemsByDay.get(dayKey) ?? [];
      const programmeCount = dayItems.length;
      const activityCount = activityCountByDay?.get(dayKey) ?? programmeCount;
      const isToday = dayKey === todayKey;
      const isSelected = dayKey === selectedDayKey;
      const primaryItem = sortPersonalProgrammeItems(dayItems)[0];
      const dateRef = new Date(`${dayKey}T12:00:00.000Z`);

      const activityPart =
        activityCount === 0
          ? ""
          : activityCount === 1 && primaryItem
            ? t("dayAriaOneActivityNamed", { title: primaryItem.title })
            : t("dayAriaActivitiesCount", { count: activityCount });

      const accessibleLabel = [
        format(dateRef, "d. MMMM yyyy", { locale: de }),
        isToday ? t("today") : null,
        isSelected ? t("selected") : null,
        activityPart || null,
      ]
        .filter(Boolean)
        .join(", ");

      const activityPreviewLabel =
        activityCount === 1 && primaryItem
          ? primaryItem.typeLabel
          : activityCount > 1
            ? t("activityMultipleShort", { count: activityCount })
            : undefined;

      return {
        dayKey,
        dayNumber,
        inMonth,
        isToday,
        activityCount,
        isSelected,
        accessibleLabel,
        activityPreviewLabel,
        primarySourceType: primaryItem?.sourceType,
      };
    });
  }, [
    activityCountByDay,
    itemsByDay,
    monthParam,
    selectedDayKey,
    t,
    timeZone,
    todayKey,
  ]);

  const selectedItems = useMemo(() => {
    const dayItems = itemsByDay.get(selectedDayKey) ?? [];
    return sortPersonalProgrammeItems(dayItems);
  }, [itemsByDay, selectedDayKey]);

  const selectedHeading = useMemo(() => {
    const ref = new Date(`${selectedDayKey}T12:00:00.000Z`);
    return format(ref, "EEEE, d. MMMM", { locale: de });
  }, [selectedDayKey]);

  return (
    <div className={cn("space-y-3", className)} data-testid="personal-programme-month-calendar">
      <MonthActivityGrid
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={gridDays}
        navigation={navigation}
        ariaLabel={t("ariaMonthGrid")}
        previousMonthLabel={t("previousMonth")}
        nextMonthLabel={t("nextMonth")}
        todayLabel={t("today")}
        headingLevel={headingLevel}
        dataTestId="personal-programme-month-grid"
        selectable
        onSelectDay={handleSelectDay}
        cellVariant="personal"
      />

      {showSelectedDayPanel ? (
        <section aria-label={t("selectedDayPanel")} data-testid="personal-programme-selected-day">
          <h3 className="mb-2 text-sm font-semibold capitalize text-[var(--foreground)]">
            {selectedHeading}
          </h3>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-[var(--text-2)]">{t("emptyDay")}</p>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.deepLink}
                    className="block rounded-lg border border-[var(--border)] px-3 py-2 no-underline hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    aria-label={item.ariaLabel}
                  >
                    <span className="block text-[0.8125rem] font-semibold text-[var(--foreground)]">
                      {item.title}
                    </span>
                    {item.subtitle ? (
                      <span className="block text-[0.75rem] text-[var(--text-2)]">{item.subtitle}</span>
                    ) : null}
                    {item.contextLabel ? (
                      <span className="mt-0.5 block text-[0.6875rem] text-[var(--muted)]">
                        {item.contextLabel}
                      </span>
                    ) : null}
                    {item.status === "cancelled" || item.status === "postponed" ? (
                      <span className="mt-1 inline-block rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--text-2)]">
                        {item.status === "cancelled" ? t("statusCancelled") : t("statusPostponed")}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
