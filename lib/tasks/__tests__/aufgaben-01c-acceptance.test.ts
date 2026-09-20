/**
 * AUFGABEN-01C — foundation acceptance (logic + recurrence calendar rules).
 */

import { describe, it, expect } from "vitest";
import { TaskStatus } from "@prisma/client";
import {
  computeSubtaskProgress,
  hasActionableSubtasks,
  assertNotSubtaskParent,
} from "../subtask-rules";
import {
  addDaysToLocalDateIso,
  buildSeriesOccurrenceKey,
  formatLocalDateIso,
  listMonthlyOccurrenceLocalDates,
  listWeeklyOccurrenceLocalDates,
  localDateTimeToUtc,
} from "../recurrence-dates";
import { TaskValidationError } from "../errors";

describe("AUFGABEN-01C progress edge cases", () => {
  it("handles zero active children", () => {
    const p = computeSubtaskProgress([]);
    expect(p.totalCount).toBe(0);
    expect(p.percent).toBe(100);
    expect(p.label).toBe("0 / 0 erledigt");
  });

  it("handles all cancelled children", () => {
    const p = computeSubtaskProgress([
      { status: TaskStatus.CANCELLED },
      { status: TaskStatus.CANCELLED },
    ]);
    expect(p.totalCount).toBe(0);
    expect(p.percent).toBe(100);
  });

  it("handles DONE/CANCELLED/OPEN mix", () => {
    const p = computeSubtaskProgress([
      { status: TaskStatus.DONE },
      { status: TaskStatus.CANCELLED },
      { status: TaskStatus.OPEN },
    ]);
    expect(p.label).toBe("1 / 2 erledigt");
    expect(p.percent).toBe(50);
  });

  it("parent completion actionable semantics", () => {
    expect(hasActionableSubtasks([{ status: TaskStatus.OPEN }])).toBe(true);
    expect(hasActionableSubtasks([{ status: TaskStatus.IN_PROGRESS }])).toBe(true);
    expect(hasActionableSubtasks([{ status: TaskStatus.DONE }])).toBe(false);
    expect(hasActionableSubtasks([{ status: TaskStatus.CANCELLED }])).toBe(false);
    expect(
      hasActionableSubtasks([
        { status: TaskStatus.DONE },
        { status: TaskStatus.CANCELLED },
      ]),
    ).toBe(false);
  });
});

describe("AUFGABEN-01C subtask depth", () => {
  it("rejects grandchild parent", () => {
    expect(() => assertNotSubtaskParent({ parentTaskId: "parent" })).toThrow(
      TaskValidationError,
    );
  });
});

describe("AUFGABEN-01C recurrence calendar", () => {
  const tz = "Europe/Zurich";

  it("weekly Sunday occurrences are Sundays in local TZ", () => {
    const dates = listWeeklyOccurrenceLocalDates({
      weekday: "SUNDAY",
      intervalWeeks: 1,
      timeZone: tz,
      now: new Date("2026-09-01T12:00:00.000Z"),
      horizonDays: 28,
    });
    expect(dates.length).toBeGreaterThan(0);
    for (const iso of dates) {
      const jsDay = new Date(localDateTimeToUtc(iso, 12, 0, tz)).getUTCDay();
      expect(jsDay).toBe(0);
    }
  });

  it("relative offsets from Sunday parent due date", () => {
    const sunday = "2026-09-21";
    expect(addDaysToLocalDateIso(sunday, -2)).toBe("2026-09-19");
    expect(addDaysToLocalDateIso(sunday, -1)).toBe("2026-09-20");
    expect(addDaysToLocalDateIso(sunday, 0)).toBe("2026-09-21");
  });

  it("DST spring forward keeps local calendar date keys stable", () => {
    const key = buildSeriesOccurrenceKey("series-x", "2026-03-29");
    expect(key).toBe("series-x:2026-03-29");
    const utc = localDateTimeToUtc("2026-03-29", 23, 59, tz);
    expect(formatLocalDateIso(utc, tz)).toBe("2026-03-29");
  });

  it("monthly occurrences respect monthDay", () => {
    const dates = listMonthlyOccurrenceLocalDates({
      monthDay: 15,
      intervalMonths: 1,
      timeZone: tz,
      now: new Date("2026-09-01T12:00:00.000Z"),
      horizonDays: 120,
    });
    expect(dates.every((d) => d.endsWith("-15"))).toBe(true);
  });
});
