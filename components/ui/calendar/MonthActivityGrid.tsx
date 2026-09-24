"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MonthActivityGridDay, MonthActivityGridNavigation } from "./month-activity-grid-types";

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

function PersonalActivityIndicator({
  count,
  previewLabel,
  sourceType,
}: {
  count: number;
  previewLabel?: string;
  sourceType?: MonthActivityGridDay["primarySourceType"];
}) {
  if (count <= 0) return null;

  const accentClass =
    sourceType === "TOURNAMENT"
      ? "bg-[var(--sce-primary)]"
      : sourceType === "MATCH"
        ? "bg-[color-mix(in_srgb,var(--sce-info)_85%,var(--foreground)_15%)]"
        : sourceType === "TRAINING"
          ? "bg-[color-mix(in_srgb,var(--sce-success)_75%,var(--foreground)_25%)]"
          : "bg-[var(--primary)]";

  if (previewLabel && count === 1) {
    return (
      <span
        className="mt-auto max-w-full truncate text-[0.5625rem] font-semibold leading-none text-[var(--text-2)]"
        aria-hidden="true"
      >
        {previewLabel}
      </span>
    );
  }

  return (
    <span className="mt-auto flex flex-col items-center gap-px" aria-hidden="true">
      <span className={cn("h-0.5 w-5 rounded-full", accentClass)} />
      {count > 1 ? (
        <span className="text-[0.5rem] font-bold tabular-nums text-[var(--muted)]">+{count - 1}</span>
      ) : null}
    </span>
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
    "relative flex min-h-[2.85rem] min-w-0 flex-col items-center justify-start rounded-lg px-0.5 pb-0.5 pt-0.5 text-xs tabular-nums sm:min-h-[2.65rem]",
    !day.inMonth && "text-[var(--muted)]/45",
    day.inMonth && "text-[var(--text-2)]",
    day.activityCount > 0 &&
      day.inMonth &&
      !day.isSelected &&
      "bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)]",
    day.isSelected && "bg-[var(--primary)] font-semibold text-white shadow-sm",
    day.isToday && !day.isSelected && "ring-1 ring-[var(--primary)]/55",
  );

  const cellClassName = variant === "matchcenter" ? matchcenterClass : personalClass;
  const showMatchcenterDot =
    variant === "matchcenter" ? day.activityCount > 0 && !day.isToday : false;

  const inner =
    variant === "personal" ? (
      <>
        <time dateTime={day.dayKey} className="leading-none">
          {day.dayNumber}
        </time>
        <PersonalActivityIndicator
          count={day.activityCount}
          previewLabel={day.activityPreviewLabel}
          sourceType={day.primarySourceType}
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
}: MonthActivityGridProps) {
  const Heading = headingLevel;

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

      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
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
