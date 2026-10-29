import type {
  ClubEventMonthOrdinal,
  ClubEventMonthlyPatternKind,
  ClubEventRecurrenceEndMode,
  ClubEventRecurrenceFrequency,
  Weekday,
} from "@prisma/client";
import type { ClubEventRecurrenceApiInput } from "@/lib/events/club-event-recurrence-api";

/** Wizard/editor recurrence field values (mirrors VeranstaltungRecurrenceFields). */
export type ClubEventRecurrenceEditorValues = {
  enabled: boolean;
  frequency: ClubEventRecurrenceFrequency;
  intervalCount: number;
  weekday: Weekday | string;
  monthlyPatternKind: ClubEventMonthlyPatternKind;
  monthDay: number;
  monthOrdinal: ClubEventMonthOrdinal;
  endMode: ClubEventRecurrenceEndMode;
  endDate: string;
  occurrenceCount: number;
};

export function clubEventRecurrenceEditorToApiPayload(
  values: ClubEventRecurrenceEditorValues,
): ClubEventRecurrenceApiInput {
  if (!values.enabled) return { enabled: false };
  return {
    enabled: true,
    frequency: values.frequency,
    intervalCount: values.intervalCount,
    weekday: values.weekday as Weekday,
    monthlyPatternKind:
      values.frequency === "MONTHLY" ? values.monthlyPatternKind : undefined,
    monthDay: values.monthlyPatternKind === "DAY_OF_MONTH" ? values.monthDay : undefined,
    monthOrdinal:
      values.monthlyPatternKind === "ORDINAL_WEEKDAY" ? values.monthOrdinal : undefined,
    endMode: values.endMode,
    endDate: values.endMode === "ON_DATE" ? values.endDate : undefined,
    occurrenceCount: values.endMode === "AFTER_COUNT" ? values.occurrenceCount : undefined,
  };
}

/** @deprecated Prefer `clubEventRecurrenceEditorToApiPayload`. */
export const recurrenceValuesToApiPayload = clubEventRecurrenceEditorToApiPayload;
