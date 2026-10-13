import { describe, expect, it } from "vitest";
import { formatClubEventRecurrenceSummaryDe } from "@/lib/events/club-event-recurrence-presentation";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";

describe("formatClubEventRecurrenceSummaryDe", () => {
  const vlRule: ClubEventRecurrenceRule = {
    frequency: "MONTHLY",
    intervalCount: 1,
    weekday: "TUESDAY",
    monthlyPatternKind: "ORDINAL_WEEKDAY",
    monthDay: null,
    monthOrdinal: "FIRST",
    allDay: false,
    startsAtTime: "18:30",
    endsAtTime: "21:00",
    timezone: "Europe/Zurich",
    seriesStartDateKey: "2026-11-03",
    endMode: "AFTER_COUNT",
    endDateKey: null,
    occurrenceCountLimit: 8,
  };

  it("describes first Tuesday monthly in natural German", () => {
    expect(formatClubEventRecurrenceSummaryDe(vlRule)).toBe(
      "Jeden ersten Dienstag im Monat · 18:30–21:00",
    );
  });

  it("uses plural month interval wording", () => {
    expect(
      formatClubEventRecurrenceSummaryDe({ ...vlRule, intervalCount: 2 }),
    ).toBe("Alle 2 Monate am ersten Dienstag · 18:30–21:00");
  });

  it("uses weekly interval wording", () => {
    const weekly: ClubEventRecurrenceRule = {
      frequency: "WEEKLY",
      intervalCount: 2,
      weekday: "MONDAY",
      monthlyPatternKind: null,
      monthDay: null,
      monthOrdinal: null,
      allDay: false,
      startsAtTime: "10:00",
      endsAtTime: "11:00",
      timezone: "Europe/Zurich",
      seriesStartDateKey: "2026-01-05",
      endMode: "AFTER_COUNT",
      endDateKey: null,
      occurrenceCountLimit: 3,
    };
    expect(formatClubEventRecurrenceSummaryDe(weekly)).toBe(
      "Alle 2 Wochen am Montag · 10:00–11:00",
    );
  });
});
