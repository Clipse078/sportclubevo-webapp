"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslations } from "next-intl";
import PersonalKalenderMobileDayAgenda from "./PersonalKalenderMobileDayAgenda";
import SceCalendarEngine from "@/components/ui/calendar/SceCalendarEngine";
import type { MonthActivityGridDay } from "@/components/ui/calendar/month-activity-grid-types";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { formatMonthLabel, parseMonthParam } from "@/lib/matchcenter/month-range";
import { parseMonthParamToGridDate } from "@/lib/calendar/month-grid";
import { sortNormalizedCalendarItems } from "@/lib/personal-agenda/calendar-item-sort";
import { resolvePersonalCalendarSelectedDayKey } from "@/lib/personal-agenda/resolve-personal-calendar-selected-day-key";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { buildPersonalCalendarDayPresentation } from "@/lib/personal-agenda/personal-calendar-micro-presentation";
import { mapCalendarSemanticTypeToProgrammeSource } from "@/lib/personal-agenda/map-calendar-semantic-to-programme-source";
import {
  isPersonalCalendarMobileCompactMode,
  type PersonalCalendarLayoutMode,
} from "@/lib/personal-agenda/personal-calendar-layout-mode";
import { usePersonalCalendarLayoutMode } from "@/lib/personal-agenda/use-personal-calendar-layout-mode";
import { cn } from "@/lib/cn";
import type { SceCalendarLegendEntry } from "@/lib/calendar/sce-calendar-engine";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

export {
  PERSONAL_CALENDAR_DAY_VISIBLE_BLOCK_LIMIT,
  resolvePersonalCalendarDayVisibleBlockLimit,
} from "@/lib/personal-agenda/personal-calendar-day-capacity";

export type PersonalKalenderMonthNavigation = {
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

export type PersonalKalenderFilterLink = {
  key: string;
  label: string;
  href: string;
  active: boolean;
};

type Props = {
  monthParam: string;
  timeZone: string;
  itemsByDayKey: Record<string, NormalizedCalendarItem[]>;
  timeLabelById: Record<string, string>;
  navigation: PersonalKalenderMonthNavigation;
  filterLinks: PersonalKalenderFilterLink[];
  tenantDisplayNames?: string[];
  fmtCfg?: TenantFormatConfig;
};

function buildDayAccessibleLabel(
  dayKey: string,
  items: NormalizedCalendarItem[],
  flags: { isToday: boolean; isSelected: boolean },
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const sorted = sortNormalizedCalendarItems(items);
  const datePart = format(new Date(`${dayKey}T12:00:00.000Z`), "d. MMMM yyyy", { locale: de });
  const activitySummary =
    sorted.length === 0
      ? ""
      : sorted.length === 1
        ? t("dayAriaOneActivityNamed", { title: sorted[0]!.title })
        : t("dayAriaActivitiesCount", { count: sorted.length });

  return [
    datePart,
    flags.isToday ? t("today") : null,
    flags.isSelected ? t("selected") : null,
    activitySummary || null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function PersonalKalenderMonthWorkspace({
  monthParam,
  timeZone,
  itemsByDayKey,
  timeLabelById,
  navigation,
  filterLinks,
  tenantDisplayNames,
  fmtCfg: fmtCfgProp,
}: Props) {
  const t = useTranslations("PersonalDashboard.calendar");
  const todayKey = matchDayKeyInTimezone(new Date(), timeZone);
  const layoutMode = usePersonalCalendarLayoutMode();
  const mobileCompact = isPersonalCalendarMobileCompactMode(layoutMode);
  const fmtCfg: TenantFormatConfig = fmtCfgProp ?? {
    locale: "de-CH",
    timezone: timeZone,
  };

  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolvePersonalCalendarSelectedDayKey({
      monthParam,
      timeZone,
      todayKey,
      itemsByDayKey,
    }),
  );

  const handleSelectDay = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
  }, []);

  const monthStart = parseMonthParamToGridDate(monthParam);
  const yearMonth =
    parseMonthParam(monthParam) ?? {
      year: monthStart.getFullYear(),
      month: monthStart.getMonth() + 1,
    };
  const monthLabel = formatMonthLabel(yearMonth, fmtCfg.locale ?? "de-CH", timeZone);

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

  const legendEntries = useMemo((): readonly SceCalendarLegendEntry[] => {
    const base: SceCalendarLegendEntry[] = [
      { sourceType: "TRAINING", label: t("legendTraining") },
      { sourceType: "MATCH", label: t("legendMatch") },
      { sourceType: "TOURNAMENT", label: t("legendTournament") },
      { sourceType: "EVENT", label: t("legendEvent") },
    ];
    const hasTasks = Object.values(itemsByDayKey).some((items) =>
      items.some((item) => item.semanticType === "TASK"),
    );
    if (hasTasks) {
      base.push({ sourceType: "TASK", label: t("legendTask") });
    }
    return base;
  }, [itemsByDayKey, t]);

  const days: MonthActivityGridDay[] = useMemo(() => {
    return buildMonthGridCells(monthParam, timeZone).map((cell) => {
      const { dayKey, dayNumber, inMonth } = cell;
      const dayItems = itemsByDayKey[dayKey] ?? [];
      const isToday = dayKey === todayKey;
      const isSelected = dayKey === selectedDayKey;
      const dayPresentation = buildPersonalCalendarDayPresentation(
        dayItems,
        fmtCfg,
        timeLabelById,
        { tenantDisplayNames },
      );
      const sorted = sortNormalizedCalendarItems(dayItems);

      return {
        dayKey,
        dayNumber,
        inMonth,
        isToday,
        activityCount: dayPresentation.activityCount,
        isSelected,
        accessibleLabel: buildDayAccessibleLabel(dayKey, dayItems, { isToday, isSelected }, t),
        primarySourceType:
          sorted.length > 0
            ? mapCalendarSemanticTypeToProgrammeSource(sorted[0]!.semanticType) ?? undefined
            : undefined,
        activityMarkerSourceTypes: dayPresentation.markerSourceTypes.filter(
          (type): type is NonNullable<typeof type> => type != null,
        ),
        sceCalendarEntries: dayPresentation.entries,
        sceCalendarOverflow:
          dayPresentation.overflowCount > 0 ? dayPresentation.overflowCount : undefined,
      };
    });
  }, [
    fmtCfg,
    itemsByDayKey,
    monthParam,
    selectedDayKey,
    t,
    tenantDisplayNames,
    timeLabelById,
    timeZone,
    todayKey,
  ]);

  const selectedDayItems = itemsByDayKey[selectedDayKey] ?? [];

  const filterToolbar = (
    <div
      className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] p-0.5"
      role="group"
      aria-label={t("filterGroupAria")}
    >
      {filterLinks.map((filter) => (
        <Link
          key={filter.key}
          href={filter.href}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-2.5 py-1 text-[0.8125rem] font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:min-h-0",
            filter.active
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
          )}
          aria-current={filter.active ? "true" : undefined}
          data-testid={`personal-kalender-filter-${filter.key}`}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );

  return (
    <section
      data-testid="personal-kalender-month-workspace"
      data-layout-mode={layoutMode}
      aria-label={t("ariaMonthGrid")}
      className="space-y-3"
    >
      <SceCalendarEngine
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={days}
        navigation={{
          previousMonthHref: navigation.previousMonthHref,
          nextMonthHref: navigation.nextMonthHref,
          todayHref: navigation.todayHref,
        }}
        ariaLabel={t("ariaMonthGrid")}
        previousMonthLabel={t("previousMonth")}
        nextMonthLabel={t("nextMonth")}
        todayLabel={t("today")}
        selectable
        onSelectDay={handleSelectDay}
        cellVariant="programme"
        showLegend
        legendEntries={legendEntries}
        toolbar={filterToolbar}
        dataTestId="personal-kalender-month-grid"
        headingLevel="h2"
      />

      {mobileCompact ? (
        <PersonalKalenderMobileDayAgenda
          dayKey={selectedDayKey}
          items={selectedDayItems}
          timeLabelById={timeLabelById}
          tenantDisplayNames={tenantDisplayNames}
        />
      ) : null}
    </section>
  );
}

export type { PersonalCalendarLayoutMode };
