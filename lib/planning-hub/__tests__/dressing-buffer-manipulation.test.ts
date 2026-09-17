import { describe, expect, it } from "vitest";
import { dressingSegmentDisplayWindow } from "../scheduler/dressing-segment-display";
import { preserveDurationOnMove } from "../scheduler/time-snap";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const TZ = "Europe/Zurich";

function matchWithDressingBuffers(): WeekplannerItem {
  return {
    id: "match:m1",
    tenantId: "t1",
    type: "MATCH",
    startAt: new Date("2026-09-20T11:00:00.000Z"), // 13:00 CEST
    endAt: new Date("2026-09-20T13:00:00.000Z"), // 15:00 CEST
    canonicalStartAt: new Date("2026-09-20T11:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T13:00:00.000Z"),
    timeOverridden: false,
    title: "Spiel",
    teamNames: [],
    pitchAllocations: [],
    dressingRoomAllocations: [
      {
        facilityResourceId: "room-o4",
        facilityId: "f1",
        code: "O4",
        name: "O4",
        facilityName: "Garderobe",
        occupancyBeforeMinutes: 60,
        occupancyAfterMinutes: 45,
      },
    ],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: 60,
    dressingRoomOccupancyAfterMinutes: 45,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
    eventId: "ev1",
  } as WeekplannerItem;
}

describe("buffered match dressing drag semantics", () => {
  it("shows occupancy 12:00–15:45 for 13:00–15:00 activity with 60/45 buffers", () => {
    const item = matchWithDressingBuffers();
    const ref = item.dressingRoomAllocations[0]!;
    const window = dressingSegmentDisplayWindow(item.startAt, item.endAt, ref);
    expect(window.startAt.toISOString()).toBe("2026-09-20T10:00:00.000Z");
    expect(window.endAt.toISOString()).toBe("2026-09-20T13:45:00.000Z");
  });

  it("drag +30 min shifts activity not buffer-expanded timestamps", () => {
    const item = matchWithDressingBuffers();
    const ref = item.dressingRoomAllocations[0]!;
    const { startAt, endAt } = preserveDurationOnMove(
      item.startAt,
      item.endAt,
      13 * 60 + 30,
      TZ,
      item.startAt,
    );
    expect(startAt.toISOString()).toBe("2026-09-20T11:30:00.000Z");
    expect(endAt.toISOString()).toBe("2026-09-20T13:30:00.000Z");

    const occupancy = dressingSegmentDisplayWindow(startAt, endAt, ref);
    expect(occupancy.startAt.toISOString()).toBe("2026-09-20T10:30:00.000Z");
    expect(occupancy.endAt.toISOString()).toBe("2026-09-20T14:15:00.000Z");
  });
});
