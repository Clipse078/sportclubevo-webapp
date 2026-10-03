"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PersonalProgrammeAgendaRow } from "@/components/ui/dashboard/PersonalProgrammeAgendaRow";
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
import { buildPersonalProgrammeDayActivityMarkers } from "@/lib/personal-agenda/programme-source-presentation";
import { buildPersonalCalendarDayActivityAriaPart } from "@/lib/personal-agenda/personal-calendar-day-activity-aria";
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
  /** Tenant-local time labels for selected-day agenda rows (same map as programme feed). */
  timeLabelById?: Record<string, string>;
  /** Optional override for dot/aria counts (e.g. tasks on full Kalender page). Programme list still uses `items`. */
  activityCountByDay?: ReadonlyMap<string, number>;
  density?: "default" | "cockpit";
  showLegend?: boolean;
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
  timeLabelById = {},
  activityCountByDay,
  density = "default",
  showLegend = true,
}: PersonalProgrammeMonthCalendarProps) {
  const t = useTranslations("PersonalDashboard.calendar");

  const ariaSummaryLabels = useMemo(
    () => ({
      training: (count: number) => t("dayAriaTrainingCount", { count }),
      match: (count: number) => t("dayAriaMatchCount", { count }),
      tournament: (count: number) => t("dayAriaTournamentCount", { count }),
      event: (count: number) => t("dayAriaEventCount", { count }),
      meeting: (count: number) => t("dayAriaMeetingCount", { count }),
      oneNamed: (title: string) => t("dayAriaOneActivityNamed", { title }),
      totalCount: (count: number) => t("dayAriaActivitiesCount", { count }),
    }),
    [t],
  );
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
          : buildPersonalCalendarDayActivityAriaPart(
              dayItems.map((item) => item.sourceType),
              ariaSummaryLabels,
              activityCount === 1 && primaryItem ? { singleTitle: primaryItem.title } : undefined,
            );

      const accessibleLabel = [
        format(dateRef, "d. MMMM yyyy", { locale: de }),
        isToday ? t("today") : null,
        isSelected ? t("selected") : null,
        activityPart || null,
      ]
        .filter(Boolean)
        .join(", ");

      const { markerSourceTypes, overflowCount } = buildPersonalProgrammeDayActivityMarkers(
        dayItems,
        activityCount,
      );

      const markerTooltip =
        activityCount > 0
          ? buildPersonalCalendarDayActivityAriaPart(
              dayItems.map((item) => item.sourceType),
              ariaSummaryLabels,
            )
          : undefined;

      return {
        dayKey,
        dayNumber,
        inMonth,
        isToday,
        activityCount,
        isSelected,
        accessibleLabel,
        primarySourceType: primaryItem?.sourceType,
        activityMarkerSourceTypes: markerSourceTypes,
        activityMarkerOverflow: overflowCount > 0 ? overflowCount : undefined,
        activityMarkerTooltip: markerTooltip,
      };
    });
  }, [
    activityCountByDay,
    itemsByDay,
    monthParam,
    selectedDayKey,
    t,
    timeZone,
    ariaSummaryLabels,
    todayKey,
  ]);

  const monthHasPersonalActivities = useMemo(() => {
    return gridDays.some((day) => day.inMonth && day.activityCount > 0);
  }, [gridDays]);

  const selectedItems = useMemo(() => {
    const dayItems = itemsByDay.get(selectedDayKey) ?? [];
    return sortPersonalProgrammeItems(dayItems);
  }, [itemsByDay, selectedDayKey]);

  const selectedHeading = useMemo(() => {
    const ref = new Date(`${selectedDayKey}T12:00:00.000Z`);
    return format(ref, "EEEE, d. MMMM", { locale: de });
  }, [selectedDayKey]);

  const isCockpit = density === "cockpit";

  return (
    <div
      className={cn(isCockpit ? "space-y-2" : "space-y-3", className)}
      data-testid="personal-programme-month-calendar"
    >
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
        showLegend={showLegend}
      />

      {!monthHasPersonalActivities ? (
        <p
          className={cn("text-[var(--text-2)]", isCockpit ? "text-xs" : "text-sm")}
          data-testid="personal-programme-empty-month"
        >
          {t("emptyMonth")}
        </p>
      ) : null}

      {showSelectedDayPanel ? (
        <section
          aria-label={t("selectedDayPanel")}
          data-testid="personal-programme-selected-day"
          className={cn(isCockpit && "max-h-[7.5rem] overflow-y-auto")}
        >
          <h3
            className={cn(
              "mb-1.5 font-semibold capitalize text-[var(--foreground)]",
              isCockpit ? "text-xs" : "mb-2 text-sm",
            )}
          >
            {selectedHeading}
          </h3>
          {selectedItems.length === 0 ? (
            <p className={cn("text-[var(--text-2)]", isCockpit ? "text-xs" : "text-sm")}>
              {t("emptyDayPersonal")}
            </p>
          ) : (
            <ul className="divide-y divide-[color-mix(in_srgb,var(--border)_70%,transparent)] border-l border-[color-mix(in_srgb,var(--border)_55%,transparent)] pl-2">
              {selectedItems.slice(0, isCockpit ? 3 : undefined).map((item) => (
                <li key={item.id} className="list-none">
                  <PersonalProgrammeAgendaRow
                    item={item}
                    timeLabel={timeLabelById[item.id] ?? "—"}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
