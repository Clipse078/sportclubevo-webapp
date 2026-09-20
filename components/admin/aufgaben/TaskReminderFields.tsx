"use client";

import { useMemo, useState } from "react";
import {
  formatDueDateInputValue,
  formatDueTimeInputValue,
} from "@/lib/tasks/task-reminder-schedule";

const PRESET_OPTIONS = [
  { value: "", label: "Keine Erinnerung" },
  { value: "SAME_DAY", label: "Am selben Tag" },
  { value: "DAYS_1", label: "1 Tag vorher" },
  { value: "DAYS_2", label: "2 Tage vorher" },
  { value: "DAYS_3", label: "3 Tage vorher" },
  { value: "WEEK_1", label: "1 Woche vorher" },
  { value: "CUSTOM", label: "Benutzerdefiniert" },
] as const;

type ReminderValues = {
  reminder1PresetKey: string | null;
  reminder2PresetKey: string | null;
  reminder1At: string | null;
  reminder2At: string | null;
};

function presetValueForTask(values: ReminderValues, stage: 1 | 2): string {
  const presetKey = stage === 1 ? values.reminder1PresetKey : values.reminder2PresetKey;
  const at = stage === 1 ? values.reminder1At : values.reminder2At;
  if (presetKey) return presetKey;
  if (at) return "CUSTOM";
  return "";
}

function customParts(atIso: string | null, timeZone: string) {
  if (!atIso) return { date: "", time: "09:00" };
  return {
    date: formatDueDateInputValue(atIso, timeZone),
    time: formatDueTimeInputValue(atIso, timeZone) || "09:00",
  };
}

type Props = {
  timeZone: string;
  values: ReminderValues;
  disabled?: boolean;
  namePrefix?: string;
};

export function TaskReminderFields({
  timeZone,
  values,
  disabled,
  namePrefix = "",
}: Props) {
  const p = namePrefix;
  const [r1, setR1] = useState(() => presetValueForTask(values, 1));
  const [r2, setR2] = useState(() => presetValueForTask(values, 2));
  const c1 = useMemo(() => customParts(values.reminder1At, timeZone), [values.reminder1At, timeZone]);
  const c2 = useMemo(() => customParts(values.reminder2At, timeZone), [values.reminder2At, timeZone]);

  return (
    <div className="space-y-3" data-testid="task-reminder-fields">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Erinnerungen
      </p>

      <label className="block space-y-1">
        <span className="text-sm text-[var(--text-2)]">1. Erinnerung</span>
        <select
          name={`${p}reminder1Preset`}
          className="fca-input w-full text-sm"
          disabled={disabled}
          value={r1}
          onChange={(e) => setR1(e.target.value)}
          data-testid="task-reminder1-preset"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {r1 === "CUSTOM" ? (
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              name={`${p}reminder1Date`}
              className="fca-input flex-1 text-sm"
              defaultValue={c1.date}
              disabled={disabled}
            />
            <input
              type="time"
              name={`${p}reminder1Time`}
              className="fca-input w-28 text-sm"
              defaultValue={c1.time}
              disabled={disabled}
            />
          </div>
        ) : null}
      </label>

      <label className="block space-y-1">
        <span className="text-sm text-[var(--text-2)]">2. Erinnerung</span>
        <select
          name={`${p}reminder2Preset`}
          className="fca-input w-full text-sm"
          disabled={disabled}
          value={r2}
          onChange={(e) => setR2(e.target.value)}
          data-testid="task-reminder2-preset"
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value || "none"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {r2 === "CUSTOM" ? (
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              name={`${p}reminder2Date`}
              className="fca-input flex-1 text-sm"
              defaultValue={c2.date}
              disabled={disabled}
            />
            <input
              type="time"
              name={`${p}reminder2Time`}
              className="fca-input w-28 text-sm"
              defaultValue={c2.time}
              disabled={disabled}
            />
          </div>
        ) : null}
      </label>
    </div>
  );
}

export function TaskDeadlineFields({
  timeZone,
  dueAt,
  disabled,
  dueDateName = "dueAt",
  dueTimeName = "dueTime",
}: {
  timeZone: string;
  dueAt: string | null;
  disabled?: boolean;
  dueDateName?: string;
  dueTimeName?: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-[var(--text-2)]">Deadline</span>
      <div className="flex gap-2">
        <input
          type="date"
          name={dueDateName}
          className="fca-input flex-1 text-sm"
          defaultValue={formatDueDateInputValue(dueAt, timeZone)}
          disabled={disabled}
          data-testid="task-deadline-date"
        />
        <input
          type="time"
          name={dueTimeName}
          className="fca-input w-28 text-sm"
          defaultValue={formatDueTimeInputValue(dueAt, timeZone)}
          disabled={disabled}
          data-testid="task-deadline-time"
        />
      </div>
    </div>
  );
}
