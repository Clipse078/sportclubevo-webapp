"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { listClubEventRecurrenceDateKeys } from "@/lib/events/club-event-recurrence";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";
import {
  formatClubEventRecurrenceSummaryDe,
  formatOccurrenceDateListDe,
} from "@/lib/events/club-event-recurrence-presentation";
import {
  clubEventRecurrenceEditorToApiPayload,
  type ClubEventRecurrenceEditorValues,
} from "@/lib/events/club-event-recurrence-editor-payload";
import type { VeranstaltungScheduleFieldValues } from "./VeranstaltungScheduleFields";

export type VeranstaltungRecurrenceFieldValues = ClubEventRecurrenceEditorValues;
export const recurrenceValuesToApiPayload = clubEventRecurrenceEditorToApiPayload;

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
  { value: "FIRST", label: "Erster" },
  { value: "SECOND", label: "Zweiter" },
  { value: "THIRD", label: "Dritter" },
  { value: "FOURTH", label: "Vierter" },
  { value: "LAST", label: "Letzter" },
];

const PREVIEW_DATE_LIMIT = 5;

function intervalUnitDe(frequency: VeranstaltungRecurrenceFieldValues["frequency"], count: number): string {
  if (frequency === "WEEKLY") {
    return count === 1 ? "Woche" : "Wochen";
  }
  return count === 1 ? "Monat" : "Monate";
}

function buildRule(
  schedule: VeranstaltungScheduleFieldValues,
  values: VeranstaltungRecurrenceFieldValues,
  timeZone: string,
): ClubEventRecurrenceRule | null {
  if (!values.enabled || !schedule.startDate) return null;
  if (values.endMode === "ON_DATE" && !values.endDate) return null;
  if (values.endMode === "AFTER_COUNT" && values.occurrenceCount < 1) return null;
  try {
    return {
      frequency: values.frequency,
      intervalCount: values.intervalCount,
      weekday:
        values.frequency === "WEEKLY" || values.monthlyPatternKind === "ORDINAL_WEEKDAY"
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
  const intervalInputId = useId();
  const endDateInputId = useId();
  const occurrenceCountInputId = useId();
  const t = useTranslations("Veranstaltungen.editor.fields");

  const preview = useMemo(() => {
    if (!values.enabled) return null;
    if (!schedule.startDate) {
      return { needsStartDate: true as const };
    }
    const rule = buildRule(schedule, values, timeZone);
    if (!rule) return null;
    try {
      const dateKeys = listClubEventRecurrenceDateKeys(rule);
      const previewKeys = dateKeys.slice(0, PREVIEW_DATE_LIMIT);
      const formatted = formatOccurrenceDateListDe(previewKeys);
      return {
        needsStartDate: false as const,
        summary: formatClubEventRecurrenceSummaryDe(rule),
        count: dateKeys.length,
        previewDates: formatted,
        hasMore: dateKeys.length > previewKeys.length,
      };
    } catch {
      return null;
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

          <div
            className="flex max-w-md flex-wrap items-center gap-2"
            data-testid="veranstaltung-recurrence-interval-sentence"
          >
            <span className="text-sm text-[var(--text-2)]">Alle</span>
            <input
              id={intervalInputId}
              type="number"
              min={1}
              max={12}
              value={values.intervalCount}
              onChange={(e) => onChange({ intervalCount: Number(e.target.value) || 1 })}
              className="fca-input h-8 w-16 text-sm"
              disabled={disabled}
              aria-label={`Wiederholung alle ${values.intervalCount} ${intervalUnitDe(values.frequency, values.intervalCount)}`}
            />
            <span className="text-sm text-[var(--text-2)]">
              {intervalUnitDe(values.frequency, values.intervalCount)}
            </span>
          </div>

          {values.frequency === "WEEKLY" ? (
            <label className="block space-y-2">
              <span className="fca-label">Wochentag</span>
              <select
                value={values.weekday}
                onChange={(e) => onChange({ weekday: e.target.value })}
                className="fca-select text-sm"
                disabled={disabled}
                data-testid="veranstaltung-recurrence-weekday"
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
                    data-testid="veranstaltung-recurrence-month-day"
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
                      data-testid="veranstaltung-recurrence-month-ordinal"
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
                      data-testid="veranstaltung-recurrence-ordinal-weekday"
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
              { value: "AFTER_COUNT", label: "Nach Terminen" },
            ]}
            aria-label="Serien-Ende"
            disabled={disabled}
            testId="veranstaltung-recurrence-end-mode"
          />

          {values.endMode === "ON_DATE" ? (
            <div
              className="flex max-w-md flex-wrap items-center gap-2"
              data-testid="veranstaltung-recurrence-end-by-date"
            >
              <span className="text-sm text-[var(--text-2)]">Bis Datum</span>
              <input
                id={endDateInputId}
                type="date"
                value={values.endDate}
                min={schedule.startDate}
                onChange={(e) => onChange({ endDate: e.target.value })}
                className="fca-input h-8 text-sm"
                disabled={disabled}
                aria-label="Enddatum der Serie"
              />
            </div>
          ) : (
            <div
              className="flex max-w-md flex-wrap items-center gap-2"
              data-testid="veranstaltung-recurrence-end-by-count"
            >
              <span className="text-sm text-[var(--text-2)]">Nach</span>
              <input
                id={occurrenceCountInputId}
                type="number"
                min={1}
                max={104}
                value={values.occurrenceCount}
                onChange={(e) => onChange({ occurrenceCount: Number(e.target.value) || 1 })}
                className="fca-input h-8 w-16 text-sm"
                disabled={disabled}
                aria-label="Anzahl Termine"
              />
              <span className="text-sm text-[var(--text-2)]">Terminen</span>
            </div>
          )}

          {preview?.needsStartDate ? (
            <p
              className="text-sm text-[var(--text-2)]"
              data-testid="veranstaltung-recurrence-missing-start-date"
            >
              Datum festlegen, um die Termine der Serie anzuzeigen.
            </p>
          ) : null}

          {preview && !preview.needsStartDate && preview.summary ? (
            <section
              className="space-y-2 border-t border-[var(--border)] pt-4 text-sm"
              data-testid="veranstaltung-recurrence-preview"
              aria-live="polite"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
                Zusammenfassung
              </h4>
              <p className="font-medium text-[var(--foreground)]">{preview.summary}</p>
              <p className="text-[var(--text-2)]">
                {preview.count} {preview.count === 1 ? "Termin" : "Termine"}
              </p>
              {preview.previewDates.length > 0 ? (
                <p className="text-[var(--text-2)]">
                  {preview.previewDates.join(" · ")}
                  {preview.hasMore ? " · …" : ""}
                </p>
              ) : null}
              {preview.hasMore ? (
                <p className="text-xs text-[var(--text-2)]">+ weitere Termine</p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Client-side materialization helper for tests / previews. */
export function previewOccurrenceCount(
  schedule: VeranstaltungScheduleFieldValues,
  values: VeranstaltungRecurrenceFieldValues,
  timeZone: string,
): number {
  const rule = buildRule(schedule, values, timeZone);
  if (!rule) return 0;
  return listClubEventRecurrenceDateKeys(rule).length;
}
