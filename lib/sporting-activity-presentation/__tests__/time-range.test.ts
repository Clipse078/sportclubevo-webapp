import { describe, expect, it } from "vitest";
import { formatSportingActivityTimeRange } from "../time-range";

describe("formatSportingActivityTimeRange — SCE-ACTIVITY-DESIGN-01C01D-R1", () => {
  it("combines start and end with en dash", () => {
    expect(
      formatSportingActivityTimeRange({ startLabel: "17:00", endLabel: "18:30" }),
    ).toBe("17:00–18:30");
    expect(
      formatSportingActivityTimeRange({ startLabel: "09:30", endLabel: "11:30" }),
    ).toBe("09:30–11:30");
  });

  it("returns start only when end is missing", () => {
    expect(formatSportingActivityTimeRange({ startLabel: "17:00", endLabel: null })).toBe("17:00");
    expect(formatSportingActivityTimeRange({ startLabel: "17:00" })).toBe("17:00");
  });

  it("does not fabricate end time or placeholders", () => {
    expect(formatSportingActivityTimeRange({ startLabel: "", endLabel: "18:30" })).toBeUndefined();
    expect(formatSportingActivityTimeRange({ startLabel: "17:00", endLabel: "?" })).toBe("17:00–?");
    expect(formatSportingActivityTimeRange({ startLabel: "17:00", endLabel: "17:00" })).toBe("17:00");
  });
});
