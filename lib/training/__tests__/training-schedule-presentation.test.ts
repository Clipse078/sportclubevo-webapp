import { describe, expect, it } from "vitest";
import { formatTrainingSlotDuration } from "@/lib/training/training-schedule-presentation";

describe("formatTrainingSlotDuration", () => {
  it("formats sub-hour durations", () => {
    expect(formatTrainingSlotDuration("17:00", "17:45")).toBe("45 min");
  });

  it("formats whole hours", () => {
    expect(formatTrainingSlotDuration("17:00", "18:00")).toBe("1 h");
    expect(formatTrainingSlotDuration("17:00", "19:00")).toBe("2 h");
  });

  it("formats mixed hour and minute durations", () => {
    expect(formatTrainingSlotDuration("17:00", "18:30")).toBe("1 h 30 min");
  });

  it("returns null for invalid ranges", () => {
    expect(formatTrainingSlotDuration("18:00", "17:00")).toBeNull();
  });
});
