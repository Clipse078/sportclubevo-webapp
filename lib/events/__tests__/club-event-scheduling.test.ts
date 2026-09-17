import { describe, expect, it } from "vitest";
import {
  allDayInclusiveDayKeys,
  formatClubEventTimingLabel,
  parseClubEventScheduleInput,
  zonedDateKeyFromInstant,
} from "@/lib/events/club-event-scheduling";

const TZ = "Europe/Zurich";

describe("SCE-EVENTS-01 club event scheduling", () => {
  it("creates single-day all-day with exclusive end", () => {
    const parsed = parseClubEventScheduleInput(
      { allDay: true, startDate: "2026-09-25", endDate: "2026-09-25" },
      TZ,
    );
    expect(parsed.allDay).toBe(true);
    expect(zonedDateKeyFromInstant(parsed.startAt, TZ)).toBe("2026-09-25");
    expect(zonedDateKeyFromInstant(parsed.endAt!, TZ)).toBe("2026-09-26");
    expect(formatClubEventTimingLabel(parsed, "de-CH", TZ)).toBe("Ganztägig");
  });

  it("creates multi-day all-day inclusive range", () => {
    const parsed = parseClubEventScheduleInput(
      { allDay: true, startDate: "2026-09-25", endDate: "2026-09-27" },
      TZ,
    );
    expect(allDayInclusiveDayKeys(parsed.startAt, parsed.endAt!, TZ)).toEqual([
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
  });

  it("creates timed event in tenant timezone", () => {
    const parsed = parseClubEventScheduleInput(
      {
        allDay: false,
        startDate: "2026-09-25",
        startTime: "18:00",
        endTime: "22:00",
      },
      TZ,
    );
    expect(parsed.allDay).toBe(false);
    expect(formatClubEventTimingLabel(parsed, "de-CH", TZ)).toMatch(/18:00/);
    expect(formatClubEventTimingLabel(parsed, "de-CH", TZ)).toMatch(/22:00/);
  });

  it("rejects end before start for all-day", () => {
    expect(() =>
      parseClubEventScheduleInput(
        { allDay: true, startDate: "2026-09-27", endDate: "2026-09-25" },
        TZ,
      ),
    ).toThrow(/Enddatum/);
  });

  it("keeps calendar date stable through UTC serialization", () => {
    const parsed = parseClubEventScheduleInput(
      { allDay: true, startDate: "2026-09-25", endDate: "2026-09-25" },
      TZ,
    );
    const roundTrip = JSON.parse(JSON.stringify(parsed)) as {
      startAt: string;
      endAt: string;
    };
    const start = new Date(roundTrip.startAt);
    const end = new Date(roundTrip.endAt);
    expect(zonedDateKeyFromInstant(start, TZ)).toBe("2026-09-25");
    expect(zonedDateKeyFromInstant(end, TZ)).toBe("2026-09-26");
  });
});
