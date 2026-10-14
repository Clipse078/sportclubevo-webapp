import { describe, expect, it } from "vitest";
import { buildTrainingCreateRecurrenceSummary } from "@/lib/training/training-create-recurrence-summary";
import type { Weekday } from "@/lib/training/types";

const LABELS: Record<Weekday, string> = {
  MONDAY: "Montag",
  TUESDAY: "Dienstag",
  WEDNESDAY: "Mittwoch",
  THURSDAY: "Donnerstag",
  FRIDAY: "Freitag",
  SATURDAY: "Samstag",
  SUNDAY: "Sonntag",
};

describe("buildTrainingCreateRecurrenceSummary", () => {
  it("uses DD.MM.YYYY in single-session summary", () => {
    const summary = buildTrainingCreateRecurrenceSummary({
      recurrenceEnabled: false,
      validFrom: "2026-10-14",
      validUntil: "",
      weekdayRows: [
        { weekday: "WEDNESDAY", enabled: true, startsAt: "17:00", endsAt: "18:30" },
      ],
      weekdayLabels: LABELS,
    });
    expect(summary).toBe("Ein Training am 14.10.2026 (Mittwoch) · 17:00–18:30");
  });

  it("localizes weekly recurrence bounds", () => {
    const summary = buildTrainingCreateRecurrenceSummary({
      recurrenceEnabled: true,
      validFrom: "2026-10-14",
      validUntil: "2026-12-01",
      weekdayRows: [{ weekday: "WEDNESDAY", enabled: true, startsAt: "17:00", endsAt: "18:30" }],
      weekdayLabels: LABELS,
    });
    expect(summary).toContain("14.10.2026");
    expect(summary).toContain("01.12.2026");
    expect(summary).not.toContain("2026-10-14");
  });
});
