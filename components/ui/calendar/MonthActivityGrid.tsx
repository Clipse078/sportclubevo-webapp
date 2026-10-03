"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/cn";
import type { MonthActivityGridDay, MonthActivityGridNavigation } from "./month-activity-grid-types";
import { PersonalProgrammeActivityIndicator } from "./PersonalProgrammeActivityIndicator";
import { CalendarMonthLegend } from "./CalendarMonthLegend";

export type MonthActivityGridProps = {
  monthLabel: string;
  weekdayLabels: readonly string[];
  days: readonly MonthActivityGridDay[];
  navigation: MonthActivityGridNavigation;
  ariaLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
  todayLabel?: string;
  headingLevel?: "h2" | "h3";
  dataTestId?: string;
  /** When true, days are focusable buttons that call onSelectDay. */
  selectable?: boolean;
  onSelectDay?: (dayKey: string) => void;
  getDayHref?: (dayKey: string) => string | undefined;
  /** Matchcenter uses non-interactive cells; dashboard uses compact dot cells. */
  cellVariant?: "matchcenter" | "personal";
  showLegend?: boolean;
};

function NavControl({
  href,
  onClick,
  label,
  testId,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const className =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className} data-testid={testId}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={className} data-testid={testId}>
      {children}
    </button>
  );
}

function ActivityDots({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sky-400" aria-hidden="true" />
  );
}

function DayCell({
  day,
  variant,
  selectable,
  onSelectDay,
  href,
}: {
  day: MonthActivityGridDay;
  variant: "matchcenter" | "personal";
  selectable: boolean;
  onSelectDay?: (dayKey: string) => void;
  href?: string;
}) {
  const ariaLabel = day.accessibleLabel;

  const matchcenterClass = cn(
    "relative flex h-8 items-center justify-center rounded-full text-xs tabular-nums",
    !day.inMonth && "text-[var(--muted)]/50",
    day.inMonth && "text-[var(--text-2)]",
    day.isToday && "bg-[var(--sce-primary)] font-semibold text-white",
  );

  const personalClass = cn(
    "relative flex min-h-[2.75rem] min-w-0 flex-col items-center justify-start rounded-lg px-0.5 pb-0.5 pt-0.5 text-xs tabular-nums sm:min-h-[2.65rem]",
    !day.inMonth && "text-[var(--muted)]/45",
    day.inMonth && "text-[var(--text-2)]",
    day.isToday &&
      !day.isSelected &&
      "bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--primary)]/45",
    day.isSelected &&
      !day.isToday &&
      "bg-[color-mix(in_srgb,var(--primary)_14%,var(--surface))] font-semibold text-[var(--foreground)] shadow-sm ring-2 ring-inset ring-[var(--primary)]",
    day.isSelected &&
      day.isToday &&
      "bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] font-semibold text-[var(--foreground)] shadow-sm ring-2 ring-inset ring-[var(--primary)] ring-offset-0",
  );

  const cellClassName = variant === "matchcenter" ? matchcenterClass : personalClass;
  const showMatchcenterDot =
    variant === "matchcenter" ? day.activityCount > 0 && !day.isToday : false;

  const inner =
    variant === "personal" ? (
      <>
        <time
          dateTime={day.dayKey}
          className={cn("leading-none", day.isToday && "font-semibold text-[var(--primary)]")}
          aria-current={day.isToday ? "date" : undefined}
        >
          {day.dayNumber}
        </time>
        <PersonalProgrammeActivityIndicator
          count={day.activityCount}
          primarySourceType={day.primarySourceType}
          markerSourceTypes={day.activityMarkerSourceTypes}
          overflowCount={day.activityMarkerOverflow}
          tooltipSummary={day.activityMarkerTooltip}
        />
      </>
    ) : (
      <>
        <time dateTime={day.dayKey}>{day.dayNumber}</time>
        {showMatchcenterDot ? <ActivityDots count={day.activityCount} /> : null}
      </>
    );

  if (selectable) {
    return (
      <button
        type="button"
        data-testid={`personal-calendar-day-${day.dayKey}`}
        data-day-key={day.dayKey}
        aria-label={ariaLabel}
        aria-pressed={day.isSelected}
        onClick={() => onSelectDay?.(day.dayKey)}
        className={cn(cellClassName, "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)]")}
      >
        {inner}
      </button>
    );
  }

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={cellClassName} data-testid={`spiele-calendar-day-${day.dayKey}`}>
        {inner}
      </Link>
    );
  }

  return (
    <span
      data-testid={`spiele-calendar-day-${day.dayKey}`}
      className={cellClassName}
      aria-label={ariaLabel}
    >
      {inner}
    </span>
  );
}

export default function MonthActivityGrid({
  monthLabel,
  weekdayLabels,
  days,
  navigation,
  ariaLabel,
  previousMonthLabel,
  nextMonthLabel,
  todayLabel,
  headingLevel = "h3",
  dataTestId = "month-activity-grid",
  selectable = false,
  onSelectDay,
  getDayHref,
  cellVariant = "personal",
  showLegend = false,
}: MonthActivityGridProps) {
  const Heading = headingLevel;
  const gridRef = useRef<HTMLDivElement>(null);

  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selectable || !onSelectDay) return;
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) {
        return;
      }
      const active = document.activeElement;
      if (!(active instanceof HTMLButtonElement) || !gridRef.current?.contains(active)) {
        return;
      }
      const dayKey = active.getAttribute("data-day-key");
      if (!dayKey) return;
      const index = days.findIndex((d) => d.dayKey === dayKey);
      if (index < 0) return;

      let nextIndex = index;
      if (key === "ArrowLeft") nextIndex = index - 1;
      if (key === "ArrowRight") nextIndex = index + 1;
      if (key === "ArrowUp") nextIndex = index - 7;
      if (key === "ArrowDown") nextIndex = index + 7;
      if (key === "Home") nextIndex = 0;
      if (key === "End") nextIndex = days.length - 1;

      const nextDay = days[nextIndex];
      if (!nextDay) return;
      event.preventDefault();
      onSelectDay(nextDay.dayKey);
      const nextButton = gridRef.current.querySelector<HTMLButtonElement>(
        `[data-day-key="${nextDay.dayKey}"]`,
      );
      nextButton?.focus();
    },
    [days, onSelectDay, selectable],
  );

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label={ariaLabel}
      data-testid={dataTestId}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Heading
          className="text-sm font-semibold capitalize text-[var(--foreground)]"
          data-testid="month-activity-grid-label"
        >
          {monthLabel}
        </Heading>
        <div className="flex items-center gap-0.5">
          <NavControl
            href={navigation.previousMonthHref}
            onClick={navigation.onPreviousMonth}
            label={previousMonthLabel}
            testId="month-activity-grid-previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </NavControl>
          {todayLabel && (navigation.todayHref || navigation.onToday) ? (
            navigation.todayHref ? (
              <Link
                href={navigation.todayHref}
                className="rounded-md px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                data-testid="month-activity-grid-today"
              >
                {todayLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={navigation.onToday}
                className="rounded-md px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                data-testid="month-activity-grid-today"
              >
                {todayLabel}
              </button>
            )
          ) : null}
          <NavControl
            href={navigation.nextMonthHref}
            onClick={navigation.onNextMonth}
            label={nextMonthLabel}
            testId="month-activity-grid-next"
          >
            <ChevronRight className="h-4 w-4" />
          </NavControl>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      {cellVariant === "personal" && showLegend ? (
        <CalendarMonthLegend className="mb-2 mt-1" compact />
      ) : null}

      <div
        ref={gridRef}
        className="mt-0.5 grid grid-cols-7 gap-0.5"
        role={selectable ? "grid" : undefined}
        onKeyDown={selectable ? handleGridKeyDown : undefined}
        data-testid="month-activity-grid-days"
      >
        {days.map((day) => (
          <DayCell
            key={day.dayKey}
            day={day}
            variant={cellVariant}
            selectable={selectable}
            onSelectDay={onSelectDay}
            href={getDayHref?.(day.dayKey)}
          />
        ))}
      </div>
    </section>
  );
}
