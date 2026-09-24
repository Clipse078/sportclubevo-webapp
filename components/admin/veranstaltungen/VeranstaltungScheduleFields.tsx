"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";
import {
  PLANNING_EDITOR_COMPACT_TIME_INPUT_CLASS,
  PLANNING_EDITOR_DATETIME_GRID_CLASS,
  PLANNING_EDITOR_DATE_INPUT_CLASS,
} from "@/components/admin/shared/planning-editor/planning-editor-layout";

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
  const t = useTranslations("Veranstaltungen.editor.fields");
  const locale = useLocale();

  const summaryDate = values.startDate
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${values.startDate}T12:00:00.000Z`))
    : null;

  return (
    <div className="space-y-4 md:col-span-2" data-testid="veranstaltung-schedule-fields">
      {values.allDay ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="fca-label">
              {t("dateStart")} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className={PLANNING_EDITOR_DATE_INPUT_CLASS}
              required
              disabled={disabled}
            />
          </label>
          <label className="block space-y-2">
            <span className="fca-label">{t("dateEnd")}</span>
            <input
              type="date"
              value={values.endDate || values.startDate}
              min={values.startDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className={PLANNING_EDITOR_DATE_INPUT_CLASS}
              disabled={disabled}
            />
          </label>
        </div>
      ) : (
        <div className={cn(PLANNING_EDITOR_DATETIME_GRID_CLASS, "md:col-span-2")}>
          <label className="block min-w-0 space-y-2">
            <span className="fca-label">
              {t("date")} <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={values.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className={PLANNING_EDITOR_DATE_INPUT_CLASS}
              required
              disabled={disabled}
            />
          </label>
          <label className="block min-w-0 space-y-2">
            <span className="fca-label">{t("timeStart")}</span>
            <input
              type="time"
              value={values.startTime}
              onChange={(e) => onChange({ startTime: e.target.value })}
              className={PLANNING_EDITOR_COMPACT_TIME_INPUT_CLASS}
              required
              disabled={disabled}
            />
          </label>
          <label className="block min-w-0 space-y-2">
            <span className="fca-label">{t("timeEnd")}</span>
            <input
              type="time"
              value={values.endTime}
              onChange={(e) => onChange({ endTime: e.target.value })}
              className={PLANNING_EDITOR_COMPACT_TIME_INPUT_CLASS}
              disabled={disabled}
            />
          </label>
        </div>
      )}

      <label
        htmlFor={allDaySwitchId}
        className="flex max-w-md cursor-pointer items-center justify-between gap-4 py-0.5"
        data-testid="veranstaltung-all-day-row"
      >
        <span className="fca-label">{t("allDay")}</span>
        <SwitchThumb
          id={allDaySwitchId}
          checked={values.allDay}
          onChange={(checked) => onChange({ allDay: checked })}
          disabled={disabled}
          aria-label={t("allDay")}
        />
      </label>

      {summaryDate ? (
        <p className="text-sm text-[var(--muted)]" data-testid="veranstaltung-schedule-summary">
          {summaryDate}
          {values.allDay
            ? ` · ${t("allDaySummary")}`
            : values.startTime
              ? ` · ${values.startTime}${values.endTime ? `–${values.endTime}` : ""}`
              : null}
        </p>
      ) : null}
    </div>
  );
}
