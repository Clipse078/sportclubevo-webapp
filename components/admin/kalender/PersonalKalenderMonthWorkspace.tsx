"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { PopoverContent } from "@/components/ui/Popover";
import PersonalCalendarEventBlock from "./PersonalCalendarEventBlock";
import PersonalKalenderMobileDayAgenda from "./PersonalKalenderMobileDayAgenda";
import { buildMonthGridCells } from "@/lib/calendar/month-grid";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { formatMonthLabel, parseMonthParam } from "@/lib/matchcenter/month-range";
import { parseMonthParamToGridDate } from "@/lib/calendar/month-grid";
import { sortNormalizedCalendarItems } from "@/lib/personal-agenda/calendar-item-sort";
import { resolvePersonalCalendarCompactDayMarkerSlots } from "@/lib/personal-agenda/personal-calendar-compact-day-markers";
import { CalendarActivityMarkers } from "@/components/ui/calendar/CalendarActivityMarkers";
import { mapCalendarSemanticTypeToProgrammeSource } from "@/lib/personal-agenda/map-calendar-semantic-to-programme-source";
import { resolvePersonalCalendarSelectedDayKey } from "@/lib/personal-agenda/resolve-personal-calendar-selected-day-key";
import type { NormalizedCalendarItem } from "@/lib/personal-agenda/normalized-calendar-item-types";
import { cn } from "@/lib/cn";
import { usePersonalCalendarDayVisibleBlockLimit } from "@/lib/personal-agenda/use-personal-calendar-day-visible-limit";
import {
  isPersonalCalendarMobileCompactMode,
  type PersonalCalendarLayoutMode,
} from "@/lib/personal-agenda/personal-calendar-layout-mode";
import { usePersonalCalendarLayoutMode } from "@/lib/personal-agenda/use-personal-calendar-layout-mode";

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
};

function NavControl({
  href,
  label,
  testId,
  children,
}: {
  href: string;
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:h-8 sm:w-8"
      data-testid={testId}
    >
      {children}
    </Link>
  );
}

function DayOverflowPopover({
  dayKey,
  items,
  timeLabelById,
  tenantDisplayNames,
  open,
  onOpenChange,
  anchorRef,
}: {
  dayKey: string;
  items: NormalizedCalendarItem[];
  timeLabelById: Record<string, string>;
  tenantDisplayNames?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("PersonalDashboard.calendar");

  return (
    <PopoverContent
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      role="dialog"
      placement="bottom-start"
      matchAnchorWidth={false}
      maxHeight={320}
      className="min-w-[14rem] p-2"
      id={`personal-kalender-overflow-${dayKey}`}
    >
      <p className="mb-2 px-1 text-xs font-semibold text-[var(--foreground)]">
        {format(new Date(`${dayKey}T12:00:00.000Z`), "EEEE, d. MMMM", { locale: de })}
      </p>
      <ul className="space-y-1" aria-label={t("dayOverflowPanelAria")}>
        {items.map((item) => (
          <li key={item.id} className="list-none">
            <PersonalCalendarEventBlock
              item={item}
              timeLabel={timeLabelById[item.id] ?? ""}
              tenantDisplayNames={tenantDisplayNames}
            />
          </li>
        ))}
      </ul>
    </PopoverContent>
  );
}

function CompactDayCell({
  dayKey,
  dayNumber,
  inMonth,
  isToday,
  isSelected,
  items,
  onSelect,
}: {
  dayKey: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  items: NormalizedCalendarItem[];
  onSelect: (dayKey: string) => void;
}) {
  const t = useTranslations("PersonalDashboard.calendar");
  const sorted = useMemo(() => sortNormalizedCalendarItems(items), [items]);
  const { markerSlots: rawSlots, overflowCount } = useMemo(
    () => resolvePersonalCalendarCompactDayMarkerSlots(sorted),
    [sorted],
  );
  const markerSlots = useMemo(
    () =>
      rawSlots
        .map((type) => mapCalendarSemanticTypeToProgrammeSource(type))
        .filter((type): type is NonNullable<typeof type> => type != null),
    [rawSlots],
  );

  const activitySummary =
    sorted.length === 0
      ? ""
      : sorted.length === 1
        ? t("dayAriaOneActivityNamed", { title: sorted[0]!.title })
        : t("dayAriaActivitiesCount", { count: sorted.length });

  const accessibleLabel = [
    format(new Date(`${dayKey}T12:00:00.000Z`), "d. MMMM yyyy", { locale: de }),
    isToday ? t("today") : null,
    isSelected ? t("selected") : null,
    activitySummary || null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      data-testid={`personal-calendar-day-${dayKey}`}
      aria-label={accessibleLabel}
      aria-pressed={isSelected}
      onClick={() => onSelect(dayKey)}
      className={cn(
        "flex min-h-[3.25rem] min-w-0 flex-col items-stretch border-b border-r border-[color-mix(in_srgb,var(--border)_65%,transparent)] p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]",
        !inMonth && "bg-[color-mix(in_srgb,var(--surface-2)_35%,transparent)]",
        inMonth && "bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]",
        isToday &&
          !isSelected &&
          "bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))] ring-1 ring-inset ring-[var(--primary)]/45",
        isSelected && "ring-2 ring-inset ring-[var(--primary)]",
      )}
    >
      <time
        dateTime={dayKey}
        aria-current={isToday ? "date" : undefined}
        className={cn(
          "text-xs font-semibold tabular-nums",
          isToday && "text-[var(--primary)]",
          !inMonth && "text-[var(--muted)]",
          inMonth && !isToday && "text-[var(--foreground)]",
        )}
      >
        {dayNumber}
      </time>
      {isToday ? <span className="sr-only">{t("today")}</span> : null}
      {isSelected && !isToday ? <span className="sr-only">{t("selected")}</span> : null}
      {sorted.length > 0 ? (
        <div
          className="mt-auto flex flex-wrap items-center justify-center gap-0.5 pt-0.5"
          aria-hidden
          data-testid={`personal-calendar-compact-markers-${dayKey}`}
        >
          <CalendarActivityMarkers markerSlots={markerSlots} overflowCount={overflowCount} />
        </div>
      ) : null}
    </button>
  );
}

function DayCell({
  dayKey,
  dayNumber,
  inMonth,
  isToday,
  isSelected,
  items,
  timeLabelById,
  onSelect,
  overflowOpen,
  onOverflowOpenChange,
  visibleBlockLimit,
  tenantDisplayNames,
}: {
  dayKey: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  items: NormalizedCalendarItem[];
  timeLabelById: Record<string, string>;
  onSelect: (dayKey: string) => void;
  overflowOpen: boolean;
  onOverflowOpenChange: (open: boolean) => void;
  visibleBlockLimit: number;
  tenantDisplayNames?: string[];
}) {
  const t = useTranslations("PersonalDashboard.calendar");
  const overflowRef = useRef<HTMLButtonElement>(null);
  const sorted = useMemo(() => sortNormalizedCalendarItems(items), [items]);
  const visible = sorted.slice(0, visibleBlockLimit);
  const overflow = sorted.slice(visibleBlockLimit);
  const activitySummary =
    sorted.length === 0
      ? ""
      : sorted.length === 1
        ? t("dayAriaOneActivityNamed", { title: sorted[0]!.title })
        : t("dayAriaActivitiesCount", { count: sorted.length });

  const accessibleLabel = [
    format(new Date(`${dayKey}T12:00:00.000Z`), "d. MMMM yyyy", { locale: de }),
    isToday ? t("today") : null,
    isSelected ? t("selected") : null,
    activitySummary || null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn(
        "flex min-h-[6.5rem] min-w-0 flex-col border-b border-r border-[color-mix(in_srgb,var(--border)_65%,transparent)] p-1 sm:min-h-[7.25rem]",
        !inMonth && "bg-[color-mix(in_srgb,var(--surface-2)_35%,transparent)]",
        inMonth && "bg-[color-mix(in_srgb,var(--surface)_92%,transparent)]",
        isToday &&
          !isSelected &&
          "bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))] ring-1 ring-inset ring-[var(--primary)]/45",
        isSelected && "ring-2 ring-inset ring-[var(--primary)]",
      )}
    >
      <button
        type="button"
        data-testid={`personal-calendar-day-${dayKey}`}
        aria-label={accessibleLabel}
        aria-pressed={isSelected}
        onClick={() => onSelect(dayKey)}
        className={cn(
          "mb-1 flex min-h-11 w-full items-center justify-between rounded px-0.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)] sm:min-h-0",
          isToday && "font-semibold text-[var(--primary)]",
          !inMonth && "text-[var(--muted)]",
          inMonth && !isToday && "font-medium text-[var(--foreground)]",
        )}
      >
        <time dateTime={dayKey} aria-current={isToday ? "date" : undefined} className="text-xs font-semibold tabular-nums">
          {dayNumber}
        </time>
        {isToday ? (
          <span className="sr-only">{t("today")}</span>
        ) : null}
        {isSelected && !isToday ? <span className="sr-only">{t("selected")}</span> : null}
      </button>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5">
        {visible.map((item) => (
          <PersonalCalendarEventBlock
            key={item.id}
            item={item}
            timeLabel={timeLabelById[item.id] ?? ""}
            tenantDisplayNames={tenantDisplayNames}
          />
        ))}
        {overflow.length > 0 ? (
          <>
            <button
              ref={overflowRef}
              type="button"
              className="mt-auto min-h-11 rounded px-0.5 py-0.5 text-left text-[0.625rem] font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)] sm:min-h-0"
              data-testid={`personal-calendar-overflow-${dayKey}`}
              aria-expanded={overflowOpen}
              aria-controls={`personal-kalender-overflow-${dayKey}`}
              onClick={(event) => {
                event.stopPropagation();
                onOverflowOpenChange(!overflowOpen);
              }}
            >
              {t("dayOverflowMore", { count: overflow.length })}
            </button>
            <DayOverflowPopover
              dayKey={dayKey}
              items={overflow}
              timeLabelById={timeLabelById}
              tenantDisplayNames={tenantDisplayNames}
              open={overflowOpen}
              onOpenChange={onOverflowOpenChange}
              anchorRef={overflowRef}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function PersonalKalenderMonthWorkspace({
  monthParam,
  timeZone,
  itemsByDayKey,
  timeLabelById,
  navigation,
  filterLinks,
  tenantDisplayNames,
}: Props) {
  const t = useTranslations("PersonalDashboard.calendar");
  const todayKey = matchDayKeyInTimezone(new Date(), timeZone);
  const layoutMode = usePersonalCalendarLayoutMode();
  const mobileCompact = isPersonalCalendarMobileCompactMode(layoutMode);

  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    resolvePersonalCalendarSelectedDayKey({
      monthParam,
      timeZone,
      todayKey,
      itemsByDayKey,
    }),
  );
  const [openOverflowDayKey, setOpenOverflowDayKey] = useState<string | null>(null);

  const monthStart = parseMonthParamToGridDate(monthParam);
  const yearMonth =
    parseMonthParam(monthParam) ?? {
      year: monthStart.getFullYear(),
      month: monthStart.getMonth() + 1,
    };
  const monthLabel = formatMonthLabel(yearMonth, "de-CH", timeZone);

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

  const gridCells = useMemo(
    () => buildMonthGridCells(monthParam, timeZone),
    [monthParam, timeZone],
  );
  const weekRowCount = Math.ceil(gridCells.length / 7);
  const visibleBlockLimit = usePersonalCalendarDayVisibleBlockLimit(weekRowCount);

  const handleSelectDay = useCallback((dayKey: string) => {
    setSelectedDayKey(dayKey);
    setOpenOverflowDayKey(null);
  }, []);

  const selectedDayItems = itemsByDayKey[selectedDayKey] ?? [];

  return (
    <section
      data-testid="personal-kalender-month-workspace"
      data-layout-mode={layoutMode}
      aria-label={t("ariaMonthGrid")}
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-sm"
    >
      <div className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--border)_70%,transparent)] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5">
            <NavControl
              href={navigation.previousMonthHref}
              label={t("previousMonth")}
              testId="personal-kalender-previous-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </NavControl>
            {navigation.todayHref ? (
              <Link
                href={navigation.todayHref}
                className="inline-flex min-h-11 items-center rounded-md px-3 py-1 text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:min-h-0 sm:px-2"
                data-testid="personal-kalender-today"
              >
                {t("today")}
              </Link>
            ) : null}
            <NavControl
              href={navigation.nextMonthHref}
              label={t("nextMonth")}
              testId="personal-kalender-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </NavControl>
          </div>
          <p
            className="text-sm font-semibold capitalize text-[var(--foreground)]"
            data-testid="personal-kalender-month-label"
            id="personal-kalender-month-heading"
          >
            {monthLabel}
          </p>
        </div>

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
      </div>

      <div
        className="grid grid-cols-7 border-b border-[color-mix(in_srgb,var(--border)_65%,transparent)] text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--text-2)]"
        role="row"
      >
        {weekdayLabels.map((label) => (
          <span
            key={label}
            className="border-r border-[color-mix(in_srgb,var(--border)_65%,transparent)] py-2 last:border-r-0"
            role="columnheader"
          >
            {label}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-7"
        data-testid="personal-kalender-month-grid"
        data-week-rows={weekRowCount}
        data-visible-block-limit={visibleBlockLimit}
        role="grid"
        aria-labelledby="personal-kalender-month-heading"
      >
        {gridCells.map((cell) => {
          const dayItems = itemsByDayKey[cell.dayKey] ?? [];
          if (mobileCompact) {
            return (
              <CompactDayCell
                key={cell.dayKey}
                dayKey={cell.dayKey}
                dayNumber={cell.dayNumber}
                inMonth={cell.inMonth}
                isToday={cell.dayKey === todayKey}
                isSelected={cell.dayKey === selectedDayKey}
                items={dayItems}
                onSelect={handleSelectDay}
              />
            );
          }
          return (
            <DayCell
              key={cell.dayKey}
              dayKey={cell.dayKey}
              dayNumber={cell.dayNumber}
              inMonth={cell.inMonth}
              isToday={cell.dayKey === todayKey}
              isSelected={cell.dayKey === selectedDayKey}
              items={dayItems}
              timeLabelById={timeLabelById}
              onSelect={handleSelectDay}
              overflowOpen={openOverflowDayKey === cell.dayKey}
              onOverflowOpenChange={(open) => setOpenOverflowDayKey(open ? cell.dayKey : null)}
              visibleBlockLimit={visibleBlockLimit}
              tenantDisplayNames={tenantDisplayNames}
            />
          );
        })}
      </div>

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
