import { describe, expect, it } from "vitest";
import {
  weekplannerConflictDoubleBookingHeadline,
  weekplannerConflictPartnerTimeLabel,
} from "../conflict-inspection-presenters";

describe("conflict-inspection-presenters", () => {
  it("formats dressing room double booking headline", () => {
    expect(
      weekplannerConflictDoubleBookingHeadline({
        facilityResourceId: "d1",
        facilityResourceName: "E1",
        resourceKind: "DRESSING_ROOM",
      }),
    ).toBe("Garderobe E1 doppelt belegt");
  });

  it("formats pitch double booking headline", () => {
    expect(
      weekplannerConflictDoubleBookingHeadline({
        facilityResourceId: "p1",
        facilityResourceName: "Kunstrasen 2 A",
        resourceKind: "PITCH_HALL",
      }),
    ).toBe("Kunstrasen 2 A doppelt belegt");
  });

  it("formats partner occupancy time range", () => {
    const label = weekplannerConflictPartnerTimeLabel(
      {
        facilityResourceId: "d1",
        facilityResourceName: "E1",
        occupancyStartAt: new Date("2026-09-16T17:15:00.000Z"),
        occupancyEndAt: new Date("2026-09-16T18:45:00.000Z"),
      },
      "de-CH",
      "Europe/Zurich",
    );
    expect(label).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
  });
});
