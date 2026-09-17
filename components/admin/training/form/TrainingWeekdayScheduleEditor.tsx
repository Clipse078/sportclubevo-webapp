"use client";

import { cn } from "@/lib/cn";
import { formatTrainingSlotDuration } from "@/lib/training/training-schedule-presentation";
import type { Weekday } from "@/lib/training/types";
import {
  TRAINING_FORM_COMPACT_TIME_INPUT_CLASS,
  TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS,
} from "@/components/admin/training/form/training-form-layout";

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
  const activeRows = rows.filter((row) => row.enabled);

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}-editor`} role="group" aria-label="Wiederholung und Zeiten">
      <div
        className={cn(
          "hidden gap-3 px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)] sm:grid",
          TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS,
        )}
        aria-hidden
      >
        <span>Wochentag</span>
        <span>Von</span>
        <span>Bis</span>
        <span>Dauer</span>
      </div>

      <div className="divide-y divide-[var(--border)]/70 rounded-lg border border-[var(--border)]/80">
        {rows.map((row) => {
          const duration = row.enabled ? formatTrainingSlotDuration(row.startsAt, row.endsAt) : null;
          return (
            <div
              key={row.weekday}
              className={cn(
                "grid grid-cols-1 gap-2 px-3 py-2.5 sm:items-center sm:gap-3",
                TRAINING_WEEKDAY_SCHEDULE_GRID_CLASS,
                row.enabled ? "bg-[var(--surface)]/40" : "bg-[var(--surface-2)]/20",
              )}
              data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}`}
              data-active={row.enabled ? "true" : "false"}
            >
              <div className="flex items-center gap-2">
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
                <span className="text-sm font-medium text-[var(--foreground)] sm:hidden">{row.label}</span>
                <span className="hidden text-sm font-medium text-[var(--foreground)] sm:inline">{row.label}</span>
              </div>

              {row.enabled ? (
                <>
                  <input
                    type="time"
                    value={row.startsAt}
                    onChange={(e) => onTimeChange(row.weekday, "startsAt", e.target.value)}
                    className={TRAINING_FORM_COMPACT_TIME_INPUT_CLASS}
                    required
                    aria-label={`${row.label} Beginn`}
                    data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-start`}
                  />
                  <input
                    type="time"
                    value={row.endsAt}
                    onChange={(e) => onTimeChange(row.weekday, "endsAt", e.target.value)}
                    className={TRAINING_FORM_COMPACT_TIME_INPUT_CLASS}
                    required
                    aria-label={`${row.label} Ende`}
                    data-testid={`${testIdPrefix}-${row.weekday.toLowerCase()}-end`}
                  />
                  <p className="text-xs tabular-nums text-[var(--text-2)] sm:text-right" aria-live="polite">
                    {duration ?? "—"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-[var(--muted)] sm:col-span-3">Nicht aktiv — Tippen zum Hinzufügen</p>
              )}
            </div>
          );
        })}
      </div>

      {activeRows.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Mindestens ein Trainingstag ist erforderlich.</p>
      ) : (
        <p className="text-xs text-[var(--text-2)]">
          {activeRows.length} {activeRows.length === 1 ? "Trainingstag" : "Trainingstage"} pro Woche
        </p>
      )}
    </div>
  );
}
