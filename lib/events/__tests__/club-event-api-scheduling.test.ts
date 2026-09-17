import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@/lib/training/recurrence";
import {
  mergeClubEventScheduleApiBody,
  parseClubEventScheduleFromApiBody,
} from "@/lib/events/club-event-api-scheduling";

const TZ = "Europe/Zurich";

describe("SCE-EVENTS-01 club event API scheduling", () => {
  it("converts timed Veranstaltung to all-day via PATCH body", () => {
    const existing = {
      allDay: false,
      startAt: zonedTimeToUtc("2026-09-25", "19:00", TZ),
      endAt: zonedTimeToUtc("2026-09-25", "21:00", TZ),
    };
    const parsed = parseClubEventScheduleFromApiBody(
      { allDay: true, startDate: "2026-09-25", endDate: "2026-09-25" },
      TZ,
      existing,
    );
    expect(parsed.allDay).toBe(true);
    expect(parsed.endAt).not.toBeNull();
  });

  it("converts all-day Veranstaltung back to timed via PATCH body", () => {
    const existing = {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-26", "00:00", TZ),
    };
    const parsed = parseClubEventScheduleFromApiBody(
      {
        allDay: false,
        startDate: "2026-09-25",
        startTime: "18:30",
        endTime: "20:00",
      },
      TZ,
      existing,
    );
    expect(parsed.allDay).toBe(false);
    expect(parsed.startAt.getTime()).toBe(zonedTimeToUtc("2026-09-25", "18:30", TZ).getTime());
  });

  it("preserves legacy timed POST when allDay is omitted", () => {
    const startAt = zonedTimeToUtc("2026-09-25", "19:00", TZ);
    const parsed = parseClubEventScheduleFromApiBody(
      {
        startAt: startAt.toISOString(),
        endAt: zonedTimeToUtc("2026-09-25", "21:00", TZ).toISOString(),
      },
      TZ,
    );
    expect(parsed.allDay).toBe(false);
  });

  it("merges partial PATCH fields onto persisted all-day event", () => {
    const existing = {
      allDay: true,
      startAt: zonedTimeToUtc("2026-09-25", "00:00", TZ),
      endAt: zonedTimeToUtc("2026-09-28", "00:00", TZ),
    };
    const merged = mergeClubEventScheduleApiBody(
      { endDate: "2026-09-26" },
      existing,
      TZ,
    );
    expect(merged.allDay).toBe(true);
    expect(merged.endDate).toBe("2026-09-26");
  });
});
