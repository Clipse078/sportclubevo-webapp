"use client";

import { useLocale, useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { cn } from "@/lib/cn";
import { PLANNING_EDITOR_DATETIME_GRID_CLASS } from "@/components/admin/shared/planning-editor/planning-editor-layout";
import { SceActivityDateInput } from "@/components/sce/activity-datetime/SceActivityDateInput";
import { SceActivityTimeInput } from "@/components/sce/activity-datetime/SceActivityTimeInput";

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
  fieldErrors?: Partial<Record<keyof VeranstaltungScheduleFieldValues | "range", string>>;
};

export default function VeranstaltungScheduleFields({
  values,
  onChange,
  disabled,
  fieldErrors,
}: VeranstaltungScheduleFieldsProps) {
  const t = useTranslations("Veranstaltungen.editor.fields");
  const locale = useLocale();
  const allDaySwitchId = "veranstaltung-all-day-switch";

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
          <SceActivityDateInput
            label={t("dateStart")}
            value={values.startDate}
            onChange={(iso) => onChange({ startDate: iso })}
            disabled={disabled}
            required
            error={fieldErrors?.startDate}
            testId="veranstaltung-start-date"
          />
          <SceActivityDateInput
            label={t("dateEnd")}
            value={values.endDate || values.startDate}
            onChange={(iso) => onChange({ endDate: iso })}
            disabled={disabled}
            error={fieldErrors?.endDate}
            testId="veranstaltung-end-date"
          />
        </div>
      ) : (
        <div className={cn(PLANNING_EDITOR_DATETIME_GRID_CLASS, "md:col-span-2")}>
          <SceActivityDateInput
            label={t("date")}
            value={values.startDate}
            onChange={(iso) => onChange({ startDate: iso })}
            disabled={disabled}
            required
            error={fieldErrors?.startDate}
            testId="veranstaltung-date"
          />
          <SceActivityTimeInput
            label={t("timeStart")}
            value={values.startTime}
            onChange={(time) => onChange({ startTime: time })}
            disabled={disabled}
            required
            error={fieldErrors?.startTime}
            testId="veranstaltung-start-time"
          />
          <SceActivityTimeInput
            label={t("timeEnd")}
            value={values.endTime}
            onChange={(time) => onChange({ endTime: time })}
            disabled={disabled}
            error={fieldErrors?.endTime ?? fieldErrors?.range}
            testId="veranstaltung-end-time"
          />
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
