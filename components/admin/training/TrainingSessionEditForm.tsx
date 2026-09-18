"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Loader2, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  formatTrainingSessionOccurrenceHeadline,
  formatTrainingSessionSeriesBaselineLine,
  formatTrainingSessionTimeRange,
  trainingSessionWeekdayLong,
} from "@/lib/training/training-session-edit-presentation";
import type { Weekday } from "@/lib/training/types";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  canManage: boolean;
  isRescheduled: boolean;
  effectiveDate: string;
  effectiveStartTime: string;
  effectiveEndTime: string;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  seriesWeekday: Weekday;
  timezone: string;
  locale: string;
  layout?: "legacy" | "workspace";
};

/**
 * TRAININGCENTER-02 — occurrence-level date/time editor for ONE canonical
 * TrainingSession. Submits the full effective schedule to
 * PATCH /api/training-sessions/[sessionId]/reschedule, which sets (or, when
 * it matches the series default exactly, clears) this occurrence's
 * override. The parent TrainingSeries recurrence is never touched.
 */
export default function TrainingSessionEditForm({
  sessionId,
  canManage,
  isRescheduled,
  effectiveDate,
  effectiveStartTime,
  effectiveEndTime,
  originalDate,
  originalStartTime,
  originalEndTime,
  seriesWeekday,
  timezone,
  locale,
  layout = "legacy",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isWorkspace = layout === "workspace";

  const [date, setDate] = useState(effectiveDate);
  const [startTime, setStartTime] = useState(effectiveStartTime);
  const [endTime, setEndTime] = useState(effectiveEndTime);
  const [saving, setSaving] = useState(false);

  const isDirty =
    date !== effectiveDate || startTime !== effectiveStartTime || endTime !== effectiveEndTime;

  const matchesSeriesDefault =
    date === originalDate && startTime === originalStartTime && endTime === originalEndTime;

  const seriesBaselineLine = formatTrainingSessionSeriesBaselineLine({
    originalDate,
    originalStartTime,
    originalEndTime,
    weekday: seriesWeekday,
  });

  const occurrenceComparisonLine = useMemo(() => {
    const headline = formatTrainingSessionOccurrenceHeadline(date, locale, timezone);
    return `${headline} · ${formatTrainingSessionTimeRange(startTime, endTime)}`;
  }, [date, startTime, endTime, locale, timezone]);

  async function handleSave() {
    if (!startTime || !endTime) {
      toast.danger("Start- und Endzeit sind erforderlich.");
      return;
    }
    if (startTime >= endTime) {
      toast.danger("Die Startzeit muss vor der Endzeit liegen.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/training-sessions/${sessionId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startsAt: startTime, endsAt: endTime }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;

      if (!res.ok) {
        throw new Error(data?.error ?? "Änderungen konnten nicht gespeichert werden.");
      }

      toast.success("Training aktualisiert.");
      router.refresh();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : "Änderungen konnten nicht gespeichert werden.", {
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  }

  function handleUseSeriesDefault() {
    setDate(originalDate);
    setStartTime(originalStartTime);
    setEndTime(originalEndTime);
  }

  const headingClass = isWorkspace
    ? "flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]"
    : "flex items-center gap-2 text-lg font-semibold text-gray-900";

  const labelClass = isWorkspace ? "fca-label" : "text-sm font-medium text-gray-700";
  const inputClass = isWorkspace
    ? "fca-input w-full tabular-nums"
    : "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="space-y-5" data-testid="training-session-edit-form">
      {!isWorkspace ? (
        <div>
          <h2 className={headingClass}>
            <CalendarClock size={18} className="text-gray-400" aria-hidden />
            Datum &amp; Zeit
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Serienstandard: {formatTrainingSessionOccurrenceHeadline(originalDate, locale, timezone)},{" "}
            {originalStartTime}–{originalEndTime} ({timezone}).
          </p>
          {isRescheduled ? (
            <p className="mt-1 text-sm font-medium text-blue-700" data-testid="training-session-edit-rescheduled-note">
              Dieses Training wurde für diesen Termin bereits angepasst.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3" data-testid="training-session-edit-series-comparison">
          {matchesSeriesDefault && !isDirty ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-emerald-300/95">
              <Check className="h-4 w-4 shrink-0" aria-hidden />
              Entspricht dem Serienstandard
            </p>
          ) : (
            <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/35 p-3 text-sm sm:grid-cols-2">
              <div className="space-y-0.5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
                  Serie
                </p>
                <p className="text-[var(--text-2)]">{seriesBaselineLine}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
                  Dieser Termin
                </p>
                <p className="font-medium text-[var(--foreground)]">{occurrenceComparisonLine}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        {isWorkspace ? (
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <CalendarClock className="h-4 w-4 text-[var(--muted)]" aria-hidden />
            Datum &amp; Zeit
          </h3>
        ) : null}

        <div
          className={cn(
            "grid gap-4",
            isWorkspace ? "sm:grid-cols-[minmax(0,1fr)_7rem_7rem] max-sm:grid-cols-1" : "sm:grid-cols-3",
          )}
          data-testid="training-session-edit-datetime-grid"
        >
          <label className="block space-y-1.5">
            <span className={labelClass}>Datum</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!canManage || saving}
              data-testid="training-session-edit-date"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Beginn</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={!canManage || saving}
              data-testid="training-session-edit-start-time"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className={labelClass}>Ende</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={!canManage || saving}
              data-testid="training-session-edit-end-time"
              className={inputClass}
            />
          </label>
        </div>

        {isWorkspace ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Serienstandard: {trainingSessionWeekdayLong(seriesWeekday)} ·{" "}
            {formatTrainingSessionTimeRange(originalStartTime, originalEndTime)} ({timezone})
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (isWorkspace && !isDirty)}
            data-testid="training-session-edit-save"
            className={cn(
              "fca-button-primary inline-flex items-center gap-2 text-sm disabled:opacity-50",
              isWorkspace && isDirty && "ring-2 ring-[var(--sce-primary)]/35",
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Wird gespeichert…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                Änderungen speichern
              </>
            )}
          </button>

          {!matchesSeriesDefault || isDirty ? (
            <button
              type="button"
              onClick={handleUseSeriesDefault}
              disabled={saving}
              data-testid="training-session-edit-use-default"
              className="fca-button-secondary inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Serienstandard wiederherstellen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
