import { describe, expect, it } from "vitest";
import { weekplannerConflictSummaryLine } from "../conflict-presenters";
import type { WeekplannerConflict } from "../types";

describe("weekplannerConflictSummaryLine", () => {
  it("uses detector occupancy window on the viewing item (not partner overlap slice)", () => {
    const conflict: WeekplannerConflict = {
      facilityResourceId: "room-o4",
      facilityResourceName: "O4",
      resourceKind: "DRESSING_ROOM",
      partnerTitle: "Juniorinnen FF-17 vs FC Arlesheim",
      occupancyStartAt: new Date("2026-09-20T06:30:00.000Z"),
      occupancyEndAt: new Date("2026-09-20T10:15:00.000Z"),
      overlapStartAt: new Date("2026-09-20T10:00:00.000Z"),
      overlapEndAt: new Date("2026-09-20T10:15:00.000Z"),
    };
    const line = weekplannerConflictSummaryLine(conflict, "de-CH", "Europe/Zurich");
    expect(line).toContain("Garderobenkonflikt");
    expect(line).toContain("O4");
    expect(line).toContain("08:30–12:15");
    expect(line).not.toContain("12:00–12:15");
  });
});
