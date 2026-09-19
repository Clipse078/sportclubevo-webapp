"use client";

import { useWeekplannerVisibleTimeRange } from "./WeekplannerVisibleTimeRangeContext";
import { listWeekplannerTimeOptions } from "@/lib/planning-hub/weekplanner-visible-time-range";

const TIME_OPTIONS = listWeekplannerTimeOptions();

export default function PlanningHubVisibleTimeRangeControl() {
  const {
    draft,
    setDraftStartMinutes,
    setDraftEndMinutes,
    saveDraft,
    validationError,
  } = useWeekplannerVisibleTimeRange();

  return (
    <div
      className="mt-3 space-y-2 border-t border-[var(--border)]/60 pt-3"
      data-testid="planning-hub-visible-time-range"
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
        Sichtbarer Zeitraum
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[7rem] flex-col gap-1 text-xs text-[var(--text-2)]">
          <span className="font-medium">Von</span>
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            value={draft.startMinutes}
            onChange={(event) => setDraftStartMinutes(Number(event.target.value))}
            aria-label="Sichtbarer Zeitraum von"
            data-testid="planning-hub-visible-time-start"
          >
            {TIME_OPTIONS.filter((o) => o.value < 24 * 60).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[7rem] flex-col gap-1 text-xs text-[var(--text-2)]">
          <span className="font-medium">Bis</span>
          <select
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
            value={draft.endMinutes}
            onChange={(event) => setDraftEndMinutes(Number(event.target.value))}
            aria-label="Sichtbarer Zeitraum bis"
            data-testid="planning-hub-visible-time-end"
          >
            {TIME_OPTIONS.filter((o) => o.value > 0).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="fca-button-secondary px-3 py-1.5 text-xs font-semibold"
          onClick={() => saveDraft()}
          data-testid="planning-hub-visible-time-save"
        >
          Speichern
        </button>
      </div>
      {validationError ? (
        <p className="text-xs text-red-500" role="alert" data-testid="planning-hub-visible-time-error">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
