"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { matchDayKeyInTimezone } from "@/lib/matchcenter/management-view";
import { cn } from "@/lib/cn";

type Props = {
  monthParam: string;
  timezone: string;
  matchDayKeys: readonly string[];
  previousMonthHref: string;
  nextMonthHref: string;
  todayHref?: string;
};

function parseMonthParam(param: string): Date {
  const [y, m] = param.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1);
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
  const monthStart = parseMonthParam(monthParam);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: de });

  const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Monatskalender"
      data-testid="spiele-month-calendar"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3
          className="text-sm font-semibold capitalize text-[var(--foreground)]"
          data-testid="matchcenter-month-label"
        >
          {monthLabel}
        </h3>
        <div className="flex items-center gap-0.5">
          <Link
            href={previousMonthHref}
            aria-label="Vorheriger Monat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            data-testid="matchcenter-month-previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {todayHref ? (
            <Link
              href={todayHref}
              className="rounded-md px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              data-testid="spiele-calendar-today"
            >
              Heute
            </Link>
          ) : null}
          <Link
            href={nextMonthHref}
            aria-label="Nächster Monat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
            data-testid="matchcenter-month-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[0.625rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);
          const key = matchDayKeyInTimezone(day, timezone);
          const hasMatches = matchDayKeySet.has(key);

          const dayLabel = format(day, "d. MMMM yyyy", { locale: de });
          const cellClassName = cn(
            "relative flex h-8 items-center justify-center rounded-full text-xs tabular-nums",
            !inMonth && "text-[var(--muted)]/50",
            inMonth && "text-[var(--text-2)]",
            isToday && "bg-[var(--sce-primary)] font-semibold text-white",
          );

          return (
            <span
              key={day.toISOString()}
              data-testid={`spiele-calendar-day-${key}`}
              className={cellClassName}
              aria-label={dayLabel}
            >
              <time dateTime={key}>{format(day, "d")}</time>
              {hasMatches && !isToday ? (
                <span
                  className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sky-400"
                  aria-hidden="true"
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

