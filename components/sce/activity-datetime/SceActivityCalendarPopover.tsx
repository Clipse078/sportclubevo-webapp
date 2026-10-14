"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { formatIsoDateKeyToDisplay } from "@/lib/sce/activity-datetime/sce-activity-datetime";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  isoDateKey: string;
  onSelectDate: (isoDateKey: string) => void;
  id?: string;
};

function parseIsoDateKey(isoDateKey: string): { year: number; month: number; day: number } | null {
  const match = isoDateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function toIsoDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function SceActivityCalendarPopover({
  open,
  onOpenChange,
  anchorRef,
  isoDateKey,
  onSelectDate,
  id,
}: Props) {
  const initial = parseIsoDateKey(isoDateKey) ?? getTodayParts();
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const gridRef = useRef<HTMLDivElement>(null);

  const todayKey = useMemo(() => {
    const t = getTodayParts();
    return toIsoDateKey(t.year, t.month, t.day);
  }, []);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const shiftMonth = useCallback((delta: number) => {
    setViewMonth((prev) => {
      let nextMonth = prev + delta;
      let nextYear = viewYear;
      while (nextMonth < 1) {
        nextMonth += 12;
        nextYear -= 1;
      }
      while (nextMonth > 12) {
        nextMonth -= 12;
        nextYear += 1;
      }
      setViewYear(nextYear);
      return nextMonth;
    });
  }, [viewYear]);

  return (
    <PopoverContent
      open={open}
      onOpenChange={onOpenChange}
      anchorRef={anchorRef}
      id={id}
      role="dialog"
      matchAnchorWidth={false}
      maxHeight={320}
      floatingLayer="composer"
      className="w-[17.5rem] bg-[var(--sce-surface-elevated)] p-3 text-[var(--foreground)]"
      data-testid="sce-activity-calendar-popover"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-md p-1 hover:bg-[var(--surface-2)]"
          aria-label="Vorheriger Monat"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">
          {new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric" }).format(
            new Date(Date.UTC(viewYear, viewMonth - 1, 1)),
          )}
        </p>
        <button
          type="button"
          className="rounded-md p-1 hover:bg-[var(--surface-2)]"
          aria-label="Nächster Monat"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-[var(--text-2)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>

      <div ref={gridRef} className="mt-1 grid grid-cols-7 gap-1" role="grid">
        {cells.map((cell) => {
          const key = toIsoDateKey(cell.year, cell.month, cell.day);
          const selected = key === isoDateKey;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-label={formatIsoDateKeyToDisplay(key)}
              className={cn(
                "h-8 rounded-md text-sm transition",
                !cell.inMonth && "text-[var(--muted)]",
                cell.inMonth && "text-[var(--foreground)] hover:bg-[var(--surface-2)]",
                selected && "bg-[var(--sce-primary)] font-semibold text-[var(--background)] hover:bg-[var(--sce-primary)]",
                isToday && !selected && "ring-1 ring-[var(--sce-primary)]/50",
              )}
              onClick={() => {
                onSelectDate(key);
                onOpenChange(false);
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </PopoverContent>
  );
}

function getTodayParts(): { year: number; month: number; day: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: Array<{ year: number; month: number; day: number; inMonth: boolean }> = [];

  for (let i = 0; i < startOffset; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, -startOffset + i + 1));
    cells.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ year, month, day, inMonth: true });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1]!;
    const d = new Date(Date.UTC(last.year, last.month - 1, last.day + 1));
    cells.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      inMonth: false,
    });
  }

  return cells.slice(0, 42);
}
