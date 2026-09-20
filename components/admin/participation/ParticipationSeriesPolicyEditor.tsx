"use client";

import { useTransition } from "react";
import { TaskReminderFields } from "@/components/admin/aufgaben/TaskReminderFields";

export type ParticipationSeriesPolicyValues = {
  participationResponseDueDaysBefore: number | null;
  participationResponseDueLocalTime: string | null;
  participationReminder1PresetKey: string | null;
  participationReminder2PresetKey: string | null;
};

type Props = {
  seriesId: string;
  timeZone: string;
  values: ParticipationSeriesPolicyValues;
  disabled?: boolean;
  onSaved?: () => void;
  onError?: (message: string) => void;
};

const DAY_OPTIONS = [
  { value: "", label: "Keine Antwortfrist" },
  { value: "0", label: "Am Trainingstag" },
  { value: "1", label: "1 Tag vorher" },
  { value: "2", label: "2 Tage vorher" },
  { value: "3", label: "3 Tage vorher" },
  { value: "7", label: "1 Woche vorher" },
] as const;

function readFormPayload(form: HTMLFormElement): Record<string, unknown> {
  const fd = new FormData(form);
  const body: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") body[key] = value;
  }
  return body;
}

export function ParticipationSeriesPolicyEditor({
  seriesId,
  timeZone,
  values,
  disabled,
  onSaved,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const daysValue =
    values.participationResponseDueDaysBefore == null
      ? ""
      : String(values.participationResponseDueDaysBefore);

  function submit(form: HTMLFormElement) {
    const body = readFormPayload(form);
    startTransition(async () => {
      const res = await fetch(`/api/training-series/${seriesId}/participation-request`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        onError?.(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      onSaved?.();
    });
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-[var(--border)] p-3"
      data-testid="participation-series-policy-editor"
      onChange={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Teilnahme</p>
      <p className="text-xs text-[var(--muted)]">Gilt für neu erzeugte Trainingstermine.</p>

      <label className="block space-y-1">
        <span className="text-sm text-[var(--text-2)]">Antwortfrist</span>
        <select
          name="participationResponseDueDaysBefore"
          className="fca-input w-full text-sm"
          disabled={disabled || pending}
          defaultValue={daysValue}
          data-testid="participation-series-days-before"
        >
          {DAY_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-[var(--text-2)]">Uhrzeit (lokal)</span>
        <input
          type="time"
          name="participationResponseDueLocalTime"
          className="fca-input w-full text-sm"
          disabled={disabled || pending}
          defaultValue={values.participationResponseDueLocalTime ?? "18:00"}
          data-testid="participation-series-local-time"
        />
      </label>

      <TaskReminderFields
        timeZone={timeZone}
        disabled={disabled || pending}
        values={{
          reminder1PresetKey: values.participationReminder1PresetKey,
          reminder2PresetKey: values.participationReminder2PresetKey,
          reminder1At: null,
          reminder2At: null,
        }}
      />
    </form>
  );
}
