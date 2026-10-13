"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import {
  generateClubEventOccurrences,
  listClubEventRecurrenceDateKeys,
} from "@/lib/events/club-event-recurrence";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";
import {
  formatClubEventRecurrenceSummaryDe,
  formatOccurrenceDateListDe,
} from "@/lib/events/club-event-recurrence-presentation";
import type { VeranstaltungScheduleFieldValues } from "./VeranstaltungScheduleFields";

export type VeranstaltungRecurrenceFieldValues = {
  enabled: boolean;
  frequency: "WEEKLY" | "MONTHLY";
  intervalCount: number;
  weekday: string;
  monthlyPatternKind: "DAY_OF_MONTH" | "ORDINAL_WEEKDAY";
  monthDay: number;
  monthOrdinal: "FIRST" | "SECOND" | "THIRD" | "FOURTH" | "LAST";
  endMode: "ON_DATE" | "AFTER_COUNT";
  endDate: string;
  occurrenceCount: number;
};

type Props = {
  schedule: VeranstaltungScheduleFieldValues;
  values: VeranstaltungRecurrenceFieldValues;
  onChange: (patch: Partial<VeranstaltungRecurrenceFieldValues>) => void;
  timeZone: string;
  disabled?: boolean;
};

const WEEKDAY_OPTIONS = [
  { value: "MONDAY", label: "Montag" },
  { value: "TUESDAY", label: "Dienstag" },
  { value: "WEDNESDAY", label: "Mittwoch" },
  { value: "THURSDAY", label: "Donnerstag" },
  { value: "FRIDAY", label: "Freitag" },
  { value: "SATURDAY", label: "Samstag" },
  { value: "SUNDAY", label: "Sonntag" },
];

const ORDINAL_OPTIONS = [
  { value: "FIRST", label: "Ersten" },
  { value: "SECOND", label: "Zweiten" },
  { value: "THIRD", label: "Dritten" },
  { value: "FOURTH", label: "Vierten" },
  { value: "LAST", label: "Letzten" },
];

function buildRule(
  schedule: VeranstaltungScheduleFieldValues,
  values: VeranstaltungRecurrenceFieldValues,
  timeZone: string,
): ClubEventRecurrenceRule | null {
  if (!values.enabled || !schedule.startDate) return null;
  try {
    return {
      frequency: values.frequency,
      intervalCount: values.intervalCount,
      weekday: values.frequency === "WEEKLY" || values.monthlyPatternKind === "ORDINAL_WEEKDAY"
        ? (values.weekday as ClubEventRecurrenceRule["weekday"])
        : null,
      monthlyPatternKind: values.frequency === "MONTHLY" ? values.monthlyPatternKind : null,
      monthDay: values.monthlyPatternKind === "DAY_OF_MONTH" ? values.monthDay : null,
      monthOrdinal:
        values.monthlyPatternKind === "ORDINAL_WEEKDAY" ? values.monthOrdinal : null,
      allDay: schedule.allDay,
      startsAtTime: schedule.allDay ? null : schedule.startTime,
      endsAtTime: schedule.allDay ? null : schedule.endTime || schedule.startTime,
      timezone: timeZone,
      seriesStartDateKey: schedule.startDate,
      endMode: values.endMode,
      endDateKey: values.endMode === "ON_DATE" ? values.endDate || null : null,
      occurrenceCountLimit:
        values.endMode === "AFTER_COUNT" ? values.occurrenceCount : null,
    };
  } catch {
    return null;
  }
}

export default function VeranstaltungRecurrenceFields({
  schedule,
  values,
  onChange,
  timeZone,
  disabled,
}: Props) {
  const switchId = useId();
  const t = useTranslations("Veranstaltungen.editor.fields");

  const preview = useMemo(() => {
    const rule = buildRule(schedule, values, timeZone);
    if (!rule || !values.enabled) return null;
    try {
      const dateKeys = listClubEventRecurrenceDateKeys(rule);
      const formatted = formatOccurrenceDateListDe(dateKeys.slice(0, 8));
      return {
        summary: formatClubEventRecurrenceSummaryDe(rule),
        count: dateKeys.length,
        sample: formatted,
      };
    } catch {
      return { summary: null, count: 0, sample: [] as string[] };
    }
  }, [schedule, values, timeZone]);

  return (
    <div className="space-y-4" data-testid="veranstaltung-recurrence-fields">
      <label
        htmlFor={switchId}
        className="flex max-w-md cursor-pointer items-center justify-between gap-4 py-0.5"
      >
        <span className="fca-label">{t("recurrence")}</span>
        <SwitchThumb
          id={switchId}
          checked={values.enabled}
          onChange={(checked) => onChange({ enabled: checked })}
          disabled={disabled}
          aria-label={t("recurrence")}
        />
      </label>

      {values.enabled ? (
        <div className="space-y-4 rounded-lg border border-[var(--border)] p-4">
          <SceSegmentedControl
            value={values.frequency}
            onChange={(frequency) =>
              onChange({ frequency: frequency as VeranstaltungRecurrenceFieldValues["frequency"] })
            }
            options={[
              { value: "WEEKLY", label: "Wöchentlich" },
              { value: "MONTHLY", label: "Monatlich" },
            ]}
            aria-label="Wiederholungsfrequenz"
            disabled={disabled}
            testId="veranstaltung-recurrence-frequency"
          />

          <label className="block max-w-xs space-y-2">
            <span className="fca-label">Intervall</span>
            <input
              type="number"
              min={1}
              max={12}
              value={values.intervalCount}
              onChange={(e) => onChange({ intervalCount: Number(e.target.value) || 1 })}
              className="fca-input h-8 w-24 text-sm"
              disabled={disabled}
            />
          </label>

          {values.frequency === "WEEKLY" ? (
            <label className="block space-y-2">
              <span className="fca-label">Wochentag</span>
              <select
                value={values.weekday}
                onChange={(e) => onChange({ weekday: e.target.value })}
                className="fca-select text-sm"
                disabled={disabled}
              >
                {WEEKDAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <SceSegmentedControl
                value={values.monthlyPatternKind}
                onChange={(kind) =>
                  onChange({
                    monthlyPatternKind: kind as VeranstaltungRecurrenceFieldValues["monthlyPatternKind"],
                  })
                }
                options={[
                  { value: "ORDINAL_WEEKDAY", label: "Wochentag im Monat" },
                  { value: "DAY_OF_MONTH", label: "Fester Tag" },
                ]}
                aria-label="Monatsmuster"
                disabled={disabled}
                testId="veranstaltung-recurrence-monthly-kind"
              />
              {values.monthlyPatternKind === "DAY_OF_MONTH" ? (
                <label className="block max-w-xs space-y-2">
                  <span className="fca-label">Tag im Monat</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={values.monthDay}
                    onChange={(e) => onChange({ monthDay: Number(e.target.value) || 1 })}
                    className="fca-input h-8 w-24 text-sm"
                    disabled={disabled}
                  />
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="fca-label">Woche im Monat</span>
                    <select
                      value={values.monthOrdinal}
                      onChange={(e) =>
                        onChange({
                          monthOrdinal: e.target
                            .value as VeranstaltungRecurrenceFieldValues["monthOrdinal"],
                        })
                      }
                      className="fca-select text-sm"
                      disabled={disabled}
                    >
                      {ORDINAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="fca-label">Wochentag</span>
                    <select
                      value={values.weekday}
                      onChange={(e) => onChange({ weekday: e.target.value })}
                      className="fca-select text-sm"
                      disabled={disabled}
                    >
                      {WEEKDAY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </>
          )}

          <SceSegmentedControl
            value={values.endMode}
            onChange={(mode) =>
              onChange({ endMode: mode as VeranstaltungRecurrenceFieldValues["endMode"] })
            }
            options={[
              { value: "ON_DATE", label: "Bis Datum" },
              { value: "AFTER_COUNT", label: "Nach X Terminen" },
            ]}
            aria-label="Serien-Ende"
            disabled={disabled}
            testId="veranstaltung-recurrence-end-mode"
          />

          {values.endMode === "ON_DATE" ? (
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Enddatum</span>
              <input
                type="date"
                value={values.endDate}
                min={schedule.startDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className="fca-input h-8 text-sm"
                disabled={disabled}
              />
            </label>
          ) : (
            <label className="block max-w-xs space-y-2">
              <span className="fca-label">Anzahl Termine</span>
              <input
                type="number"
                min={1}
                max={104}
                value={values.occurrenceCount}
                onChange={(e) => onChange({ occurrenceCount: Number(e.target.value) || 1 })}
                className="fca-input h-8 w-24 text-sm"
                disabled={disabled}
              />
            </label>
          )}

          {preview?.summary ? (
            <div className="space-y-2 text-sm" data-testid="veranstaltung-recurrence-preview">
              <p className="font-medium text-[var(--foreground)]">{preview.summary}</p>
              <p className="text-[var(--text-2)]">{preview.count} Termine</p>
              <ul className="text-[var(--text-2)]">
                {preview.sample.map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {preview.count > preview.sample.length ? <li>…</li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function recurrenceValuesToApiPayload(
  schedule: VeranstaltungScheduleFieldValues,
  values: VeranstaltungRecurrenceFieldValues,
) {
  if (!values.enabled) return { enabled: false };
  return {
    enabled: true,
    frequency: values.frequency,
    intervalCount: values.intervalCount,
    weekday: values.weekday,
    monthlyPatternKind: values.frequency === "MONTHLY" ? values.monthlyPatternKind : undefined,
    monthDay: values.monthlyPatternKind === "DAY_OF_MONTH" ? values.monthDay : undefined,
    monthOrdinal: values.monthlyPatternKind === "ORDINAL_WEEKDAY" ? values.monthOrdinal : undefined,
    endMode: values.endMode,
    endDate: values.endMode === "ON_DATE" ? values.endDate : undefined,
    occurrenceCount: values.endMode === "AFTER_COUNT" ? values.occurrenceCount : undefined,
  };
}

/** Client-side materialization helper for tests / previews. */
export function previewOccurrenceCount(
  schedule: VeranstaltungScheduleFieldValues,
  values: VeranstaltungRecurrenceFieldValues,
  timeZone: string,
): number {
  const rule = buildRule(schedule, values, timeZone);
  if (!rule) return 0;
  return generateClubEventOccurrences(rule).length;
}
