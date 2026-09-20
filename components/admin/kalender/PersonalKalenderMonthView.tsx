"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
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
import { cn } from "@/lib/cn";
import type { PersonalCalendarItem } from "@/lib/personal-agenda/types";

type Props = {
  monthParam: string;
  items: PersonalCalendarItem[];
  previousMonthHref: string;
  nextMonthHref: string;
};

function parseMonthParam(param: string): Date {
  const [y, m] = param.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1);
}

function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export default function PersonalKalenderMonthView({
  monthParam,
  items,
  previousMonthHref,
  nextMonthHref,
}: Props) {
  const monthStart = parseMonthParam(monthParam);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: de });
  const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const itemsByDay = new Map<string, PersonalCalendarItem[]>();
  for (const item of items) {
    const key = dayKey(item.startAt);
    const list = itemsByDay.get(key) ?? [];
    list.push(item);
    itemsByDay.set(key, list);
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Persönlicher Kalender"
      data-testid="personal-kalender-month"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold capitalize text-[var(--foreground)]">{monthLabel}</h2>
        <div className="flex items-center gap-0.5">
          <Link
            href={previousMonthHref}
            aria-label="Vorheriger Monat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={nextMonthHref}
            aria-label="Nächster Monat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
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

      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const key = dayKey(day);
          const dayItems = (itemsByDay.get(key) ?? []).slice(0, 4);
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={cn(
                "min-h-[4.5rem] rounded-md border border-transparent p-0.5 text-left",
                inMonth ? "bg-[var(--background)]" : "bg-[var(--surface-2)]/40 opacity-60",
                isToday && "ring-1 ring-[var(--primary)]/40",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 block text-[0.6875rem] font-semibold tabular-nums",
                  isToday ? "text-[var(--primary)]" : "text-[var(--text-2)]",
                )}
              >
                {format(day, "d")}
              </span>
              <ul className="space-y-0.5">
                {dayItems.map((item) => {
                  const isTask = item.sourceType === "TASK";
                  const inner = (
                    <span className="flex min-w-0 items-center gap-0.5 truncate text-[0.625rem] leading-tight text-[var(--foreground)]">
                      {isTask ? (
                        <ListChecks className="h-2.5 w-2.5 shrink-0 text-[var(--text-2)]" aria-hidden />
                      ) : null}
                      <span className="truncate">{isTask ? item.title : item.title}</span>
                    </span>
                  );
                  if (item.href) {
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="block rounded px-0.5 py-px hover:bg-[var(--surface-2)]"
                          aria-label={item.ariaLabel}
                          title={item.title}
                        >
                          {inner}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id} className="px-0.5 py-px" aria-label={item.ariaLabel}>
                      {inner}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
