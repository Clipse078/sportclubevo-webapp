"use client";

import { useId } from "react";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";

export type VeranstaltungScheduleFieldValues = {
  allDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
};

type VeranstaltungScheduleFieldsProps = {
  values: VeranstaltungScheduleFieldValues;
  onChange: (patch: Partial<VeranstaltungScheduleFieldValues>) => void;
  disabled?: boolean;
};

export default function VeranstaltungScheduleFields({
  values,
  onChange,
  disabled,
}: VeranstaltungScheduleFieldsProps) {
  const allDaySwitchId = useId();

  const summaryDate = values.startDate
    ? new Intl.DateTimeFormat("de-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${values.startDate}T12:00:00.000Z`))
    : null;

  return (
    <div className="space-y-4 md:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="fca-label">
            {values.allDay ? "Beginn" : "Datum"}{" "}
            <span className="text-rose-500">*</span>
          </span>
          <input
            type="date"
            value={values.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            className="fca-input"
            required
            disabled={disabled}
          />
        </label>

        {values.allDay ? (
          <label className="block space-y-2">
            <span className="fca-label">Ende</span>
            <input
              type="date"
              value={values.endDate || values.startDate}
              min={values.startDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="fca-input"
              disabled={disabled}
            />
          </label>
        ) : null}
      </div>

      <label
        htmlFor={allDaySwitchId}
        className="flex max-w-md cursor-pointer items-center justify-between gap-4 py-0.5"
        data-testid="veranstaltung-all-day-row"
      >
        <span className="fca-label">Ganztägig</span>
        <SwitchThumb
          id={allDaySwitchId}
          checked={values.allDay}
          onChange={(checked) => onChange({ allDay: checked })}
          disabled={disabled}
          aria-label="Ganztägig"
        />
      </label>

      {!values.allDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="fca-label">Beginn</span>
            <input
              type="time"
              value={values.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              className="fca-input"
              required
              disabled={disabled}
            />
          </label>
          <label className="block space-y-2">
            <span className="fca-label">Ende</span>
            <input
              type="time"
              value={values.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              className="fca-input"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {summaryDate ? (
        <p className={cn("text-sm text-[var(--muted)]")} data-testid="veranstaltung-schedule-summary">
          {summaryDate}
          {values.allDay ? " · Ganztägig" : values.startTime ? ` · ${values.startTime}${values.endTime ? `–${values.endTime}` : ""}` : null}
        </p>
      ) : null}
    </div>
  );
}
