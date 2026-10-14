import { formatIsoDateKeyToDisplay } from "@/lib/sce/activity-datetime/sce-activity-datetime";
import type { Weekday } from "@/lib/training/types";

export type TrainingCreateRecurrenceSummaryInput = {
  recurrenceEnabled: boolean;
  validFrom: string;
  validUntil: string;
  weekdayRows: ReadonlyArray<{
    weekday: Weekday;
    enabled: boolean;
    startsAt: string;
    endsAt: string;
  }>;
  weekdayLabels: Record<Weekday, string>;
};

/** User-facing German schedule summary for Training Composer (no raw ISO dates). */
export function buildTrainingCreateRecurrenceSummary(
  input: TrainingCreateRecurrenceSummaryInput,
): string {
  const active = input.weekdayRows.filter((row) => row.enabled);
  const formatDate = (iso: string) =>
    iso ? formatIsoDateKeyToDisplay(iso) : "—";

  if (!input.recurrenceEnabled) {
    if (!input.validFrom) {
      return "Ein Training ohne Wiederholung.";
    }
    return active.length
      ? `Ein Training am ${formatDate(input.validFrom)} (${input.weekdayLabels[active[0]!.weekday]}) · ${active[0]!.startsAt}–${active[0]!.endsAt}`
      : "Ein Training ohne Wiederholung — bitte Datum wählen.";
  }

  const days = active.map((row) => input.weekdayLabels[row.weekday]).join(", ");
  return `Wöchentlich ab ${formatDate(input.validFrom)} · ${days || "keine Trainingstage"} · bis ${formatDate(input.validUntil)}`;
}
