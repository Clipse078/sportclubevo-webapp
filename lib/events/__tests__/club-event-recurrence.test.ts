import { describe, expect, it } from "vitest";
import {
  generateClubEventOccurrences,
  listClubEventRecurrenceDateKeys,
} from "@/lib/events/club-event-recurrence";
import type { ClubEventRecurrenceRule } from "@/lib/events/club-event-recurrence-types";

const TZ = "Europe/Zurich";

function formatDe(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

describe("club-event-recurrence — FIRST TUESDAY MONTHLY", () => {
  const rule: ClubEventRecurrenceRule = {
    frequency: "MONTHLY",
    intervalCount: 1,
    weekday: "TUESDAY",
    monthlyPatternKind: "ORDINAL_WEEKDAY",
    monthDay: null,
    monthOrdinal: "FIRST",
    allDay: false,
    startsAtTime: "18:30",
    endsAtTime: "21:00",
    timezone: TZ,
    seriesStartDateKey: "2026-11-03",
    endMode: "AFTER_COUNT",
    endDateKey: null,
    occurrenceCountLimit: 4,
  };

  it("generates canonical VL sample dates", () => {
    const keys = listClubEventRecurrenceDateKeys(rule);
    expect(keys.map(formatDe)).toEqual([
      "03.11.2026",
      "01.12.2026",
      "05.01.2027",
      "02.02.2027",
    ]);
  });

  it("keeps 18:30 local wall time across DST boundaries", () => {
    const summerRule: ClubEventRecurrenceRule = {
      ...rule,
      seriesStartDateKey: "2026-06-02",
      occurrenceCountLimit: 2,
    };
    const occ = generateClubEventOccurrences(summerRule);
    const parts = new Intl.DateTimeFormat("de-CH", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(occ[0]!.startAt);
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    expect(`${hour}:${minute}`).toBe("18:30");
  });
});

describe("club-event-recurrence — weekly", () => {
  it("supports bi-weekly intervals", () => {
    const rule: ClubEventRecurrenceRule = {
      frequency: "WEEKLY",
      intervalCount: 2,
      weekday: "MONDAY",
      monthlyPatternKind: null,
      monthDay: null,
      monthOrdinal: null,
      allDay: false,
      startsAtTime: "10:00",
      endsAtTime: "11:00",
      timezone: TZ,
      seriesStartDateKey: "2026-01-05",
      endMode: "AFTER_COUNT",
      endDateKey: null,
      occurrenceCountLimit: 3,
    };
    const keys = listClubEventRecurrenceDateKeys(rule);
    expect(keys).toEqual(["2026-01-05", "2026-01-19", "2026-02-02"]);
  });
});

describe("club-event-recurrence — monthly fixed day", () => {
  it("clamps to month length", () => {
    const rule: ClubEventRecurrenceRule = {
      frequency: "MONTHLY",
      intervalCount: 1,
      weekday: null,
      monthlyPatternKind: "DAY_OF_MONTH",
      monthDay: 31,
      monthOrdinal: null,
      allDay: true,
      startsAtTime: null,
      endsAtTime: null,
      timezone: TZ,
      seriesStartDateKey: "2026-01-31",
      endMode: "AFTER_COUNT",
      endDateKey: null,
      occurrenceCountLimit: 3,
    };
    const keys = listClubEventRecurrenceDateKeys(rule);
    expect(keys[1]).toBe("2026-02-28");
  });
});
