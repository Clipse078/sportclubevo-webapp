import { describe, expect, it } from "vitest";
import { buildPersonalCalendarDayActivityAriaPart } from "../personal-calendar-day-activity-aria";

const labels = {
  training: (count: number) => (count === 1 ? "1 Training" : `${count} Trainings`),
  match: (count: number) => (count === 1 ? "1 Spiel" : `${count} Spiele`),
  tournament: (count: number) => (count === 1 ? "1 Turnier" : `${count} Turniere`),
  event: (count: number) => (count === 1 ? "1 Veranstaltung" : `${count} Veranstaltungen`),
  meeting: (count: number) => `${count} Meeting`,
  oneNamed: (title: string) => `1 Termin: ${title}`,
  totalCount: (count: number) => `${count} Termine`,
};

describe("buildPersonalCalendarDayActivityAriaPart", () => {
  it("accessible marker summary for mixed day", () => {
    expect(
      buildPersonalCalendarDayActivityAriaPart(["TRAINING", "TRAINING", "MATCH"], labels),
    ).toBe("2 Trainings, 1 Spiel");
  });
});
