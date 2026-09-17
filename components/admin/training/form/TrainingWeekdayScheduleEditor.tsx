"use client";

import { cn } from "@/lib/cn";
import type { Weekday } from "@/lib/training/types";

export type TrainingWeekdayScheduleRow = {
  weekday: Weekday;
  label: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
};

type Props = {
  rows: TrainingWeekdayScheduleRow[];
  onToggle: (weekday: Weekday) => void;
  onTimeChange: (weekday: Weekday, field: "startsAt" | "endsAt", value: string) => void;
  testIdPrefix?: string;
};

const SHORT_LABELS: Record<Weekday, string> = {
  MONDAY: "Mo",
  TUESDAY: "Di",
  WEDNESDAY: "Mi",
  THURSDAY: "Do",
  FRIDAY: "Fr",
  SATURDAY: "Sa",
  SUNDAY: "So",
};

export default function TrainingWeekdayScheduleEditor({
  rows,
  onToggle,
  onTimeChange,
  testIdPrefix = "training-weekday",
}: Props) {
  return (
    <div className="space-y-1.5" data-testid={`${testIdPrefix}-editor`}>
      {rows.map((row) => (
        <div
          key={row.weekday}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
            row.enabled
              ? "border-emerald-500/25 bg-emerald-500/[0.06]"
              : "border-[var(--border)] bg-[var(--surface-2)]/40 py-1.5",
          )}
          data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}`}
        >
          <button
            type="button"
            onClick={() => onToggle(row.weekday)}
            aria-pressed={row.enabled}
            className={cn(
              "flex min-w-[3.25rem] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold tabular-nums transition-colors",
              row.enabled
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {SHORT_LABELS[row.weekday]}
          </button>
          {row.enabled ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="time"
                value={row.startsAt}
                onChange={(e) => onTimeChange(row.weekday, "startsAt", e.target.value)}
                className="fca-input h-9 w-[6.5rem] px-2 py-1"
                required
                data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-start`}
              />
              <span className="text-[var(--muted)]">–</span>
              <input
                type="time"
                value={row.endsAt}
                onChange={(e) => onTimeChange(row.weekday, "endsAt", e.target.value)}
                className="fca-input h-9 w-[6.5rem] px-2 py-1"
                required
                data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-end`}
              />
              <span className="hidden text-xs text-[var(--muted)] sm:inline">{row.label}</span>
            </div>
          ) : (
            <span className="text-xs text-[var(--muted)]">Inaktiv</span>
          )}
        </div>
      ))}
    </div>
  );
}
