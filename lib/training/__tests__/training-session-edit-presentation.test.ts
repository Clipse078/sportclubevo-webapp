import { describe, expect, it } from "vitest";
import {
  formatTrainingSessionSeriesBaselineLine,
  trainingSessionMatchesSeriesStandard,
  trainingSessionOverrideStatusLabel,
} from "@/lib/training/training-session-edit-presentation";

describe("training-session-edit-presentation", () => {
  it("formats series baseline from canonical weekday and wall times", () => {
    expect(
      formatTrainingSessionSeriesBaselineLine({
        originalDate: "2026-09-17",
        originalStartTime: "19:15",
        originalEndTime: "20:45",
        weekday: "THURSDAY",
      }),
    ).toBe("Donnerstag · 19:15–20:45");
  });

  it("detects series-standard vs override state from canonical flags", () => {
    expect(
      trainingSessionMatchesSeriesStandard({
        session: { isRescheduled: false, dressingRoomOccupancyMode: "DEFAULT" },
        sessionAllocations: [],
      }),
    ).toBe(true);

    expect(
      trainingSessionMatchesSeriesStandard({
        session: { isRescheduled: true, dressingRoomOccupancyMode: "DEFAULT" },
        sessionAllocations: [],
      }),
    ).toBe(false);

    expect(trainingSessionOverrideStatusLabel(true)).toBe("Serienstandard");
    expect(trainingSessionOverrideStatusLabel(false)).toBe("Abweichend von Serie");
  });
});
