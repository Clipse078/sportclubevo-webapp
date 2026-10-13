import type { Weekday } from "@prisma/client";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";

const WEEKDAY_LABELS_DE: Record<Weekday, string> = {
  MONDAY: "Montag",
  TUESDAY: "Dienstag",
  WEDNESDAY: "Mittwoch",
  THURSDAY: "Donnerstag",
  FRIDAY: "Freitag",
  SATURDAY: "Samstag",
  SUNDAY: "Sonntag",
};

const ORDINAL_LABELS_DE = {
  FIRST: "ersten",
  SECOND: "zweiten",
  THIRD: "dritten",
  FOURTH: "vierten",
  LAST: "letzten",
} as const;

export function formatClubEventRecurrenceSummaryDe(rule: ClubEventRecurrenceRule): string {
  const timePart =
    rule.allDay || !rule.startsAtTime
      ? "Ganztägig"
      : rule.endsAtTime && rule.endsAtTime !== rule.startsAtTime
        ? `${rule.startsAtTime}–${rule.endsAtTime}`
        : rule.startsAtTime;

  if (rule.frequency === "WEEKLY" && rule.weekday) {
    const interval =
      rule.intervalCount === 1 ? "Jede Woche" : `Alle ${rule.intervalCount} Wochen`;
    return `${interval} am ${WEEKDAY_LABELS_DE[rule.weekday]} · ${timePart}`;
  }

  if (rule.monthlyPatternKind === "DAY_OF_MONTH" && rule.monthDay) {
    const interval =
      rule.intervalCount === 1 ? "Jeden Monat" : `Alle ${rule.intervalCount} Monate`;
    return `${interval} am ${rule.monthDay}. · ${timePart}`;
  }

  if (rule.weekday && rule.monthOrdinal) {
    const interval =
      rule.intervalCount === 1 ? "Jeden Monat" : `Alle ${rule.intervalCount} Monate`;
    return `${interval} am ${ORDINAL_LABELS_DE[rule.monthOrdinal]} ${WEEKDAY_LABELS_DE[rule.weekday]} · ${timePart}`;
  }

  return timePart;
}

export function formatOccurrenceDateListDe(dateKeys: string[], locale = "de-CH"): string[] {
  return dateKeys.map((key) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  });
}
