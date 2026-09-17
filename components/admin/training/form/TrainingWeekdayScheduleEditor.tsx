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
    <div className="space-y-1" data-testid={`${testIdPrefix}-editor`} role="group" aria-label="Wiederholung und Zeiten">
      {rows.map((row) => (
        <div
          key={row.weekday}
          className={cn(
            "flex min-h-[2.5rem] flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors",
            row.enabled
              ? "border-l-2 border-l-emerald-400/70 border-[var(--border)] bg-emerald-500/[0.05]"
              : "border-[var(--border)]/80 bg-[var(--surface-2)]/30",
          )}
          data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}`}
          data-active={row.enabled ? "true" : "false"}
        >
          <button
            type="button"
            onClick={() => onToggle(row.weekday)}
            aria-pressed={row.enabled}
            aria-label={`${row.label} ${row.enabled ? "deaktivieren" : "aktivieren"}`}
            className={cn(
              "flex w-9 shrink-0 items-center justify-center rounded-md px-1 py-1 text-xs font-bold tabular-nums transition-colors",
              row.enabled
                ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/35"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {SHORT_LABELS[row.weekday]}
          </button>
          {row.enabled ? (
            <div className="flex flex-1 flex-wrap items-center gap-2 text-sm">
              <input
                type="time"
                value={row.startsAt}
                onChange={(e) => onTimeChange(row.weekday, "startsAt", e.target.value)}
                className="fca-input h-8 w-[6.25rem] px-2 py-0.5 text-sm font-medium tabular-nums"
                required
                aria-label={`${row.label} Beginn`}
                data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-start`}
              />
              <span className="text-[var(--muted)]" aria-hidden="true">
                →
              </span>
              <input
                type="time"
                value={row.endsAt}
                onChange={(e) => onTimeChange(row.weekday, "endsAt", e.target.value)}
                className="fca-input h-8 w-[6.25rem] px-2 py-0.5 text-sm font-medium tabular-nums"
                required
                aria-label={`${row.label} Ende`}
                data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-end`}
              />
              <span className="sr-only">{row.label}</span>
            </div>
          ) : (
            <span className="flex-1 text-xs text-[var(--muted)]">Nicht aktiv</span>
          )}
        </div>
      ))}
    </div>
  );
}
