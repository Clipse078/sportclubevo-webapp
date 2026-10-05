import { describe, expect, it } from "vitest";
import {
  buildManipulationResourceAvailabilityList,
  pickRecommendedManipulationResourceId,
  sortManipulationResourceAvailabilityForPicker,
  manipulationResourceAvailabilityStatusText,
  manipulationResourceAvailabilityBoardLines,
  manipulationResourceAvailabilityCellSelectable,
} from "../manipulation-resource-availability";
import type { WeekplannerMatchItem, WeekplannerResourceRef } from "@/lib/weekplanner/types";

const KR2_FULL: WeekplannerResourceRef = {
  facilityResourceId: "kr2-full",
  facilityId: "fac-kr2",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Anlage",
  resourceType: "FULL_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR2_A: WeekplannerResourceRef = {
  facilityResourceId: "kr2-a",
  facilityId: "fac-kr2",
  code: "KR2_A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR2_B: WeekplannerResourceRef = {
  facilityResourceId: "kr2-b",
  facilityId: "fac-kr2",
  code: "KR2_B",
  name: "Kunstrasen 2 B",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const KR3_A: WeekplannerResourceRef = {
  facilityResourceId: "kr3-a",
  facilityId: "fac-kr3",
  code: "KR3_A",
  name: "Kunstrasen 3 A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const E1: WeekplannerResourceRef = {
  facilityResourceId: "room-e1",
  facilityId: "fac-dress",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  resourceType: "DRESSING_ROOM",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

const E2: WeekplannerResourceRef = {
  facilityResourceId: "room-e2",
  facilityId: "fac-dress",
  code: "E2",
  name: "E2",
  facilityName: "Garderobe",
  resourceType: "DRESSING_ROOM",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

function matchBase(overrides: Partial<WeekplannerMatchItem>): WeekplannerMatchItem {
  const startAt = new Date("2026-09-20T15:00:00.000Z");
  const endAt = new Date("2026-09-20T16:30:00.000Z");
  return {
    id: "match:edit",
    tenantId: "t1",
    type: "MATCH",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Junioren F1",
    teamNames: ["F1"],
    opponentName: "X",
    homeAway: "HOME",
    eventId: "ev-edit",
    pitchAllocations: [KR2_A],
    dressingRoomAllocations: [E1],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [KR2_A],
    canonicalDressingRoomAllocations: [E1],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [
      {
        facilityResourceId: "kr2-b",
        facilityResourceName: "Kunstrasen 2 B",
        resourceKind: "PITCH_HALL",
        partnerItemId: "match:other",
        partnerTitle: "Junioren E2",
        overlapStartAt: startAt,
        overlapEndAt: endAt,
        occupancyStartAt: startAt,
        occupancyEndAt: endAt,
      },
    ],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
    ...overrides,
  } as WeekplannerMatchItem;
}

describe("manipulation-resource-availability — SCE-PLANNER-UX-08-05R2", () => {
  const reservationStart = new Date("2026-09-20T15:00:00.000Z");
  const reservationEnd = new Date("2026-09-20T16:30:00.000Z");

  it("marks available resources as Frei", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Junioren E2",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_FULL, KR2_A, KR2_B, KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const kr3 = list.find((e) => e.resourceId === KR3_A.facilityResourceId)!;
    expect(kr3.state).toBe("AVAILABLE");
    expect(manipulationResourceAvailabilityStatusText(kr3, editing)).toBe("Frei");
  });

  it("marks occupied resources as Belegt with activity context", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Junioren E2",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_B],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const entry = list[0]!;
    expect(entry.state).toBe("OCCUPIED");
    expect(manipulationResourceAvailabilityStatusText(entry, editing)).toBe("Belegt");
    expect(entry.conflicts[0]?.activityLabel).toBe("Junioren E2");
  });

  it("marks current resource as Aktuell and surfaces conflict state", () => {
    const editing = matchBase({});
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const current = list[0]!;
    expect(current.isCurrent).toBe(true);
    expect(manipulationResourceAvailabilityStatusText(current, editing)).toContain("Aktuell");
    expect(manipulationResourceAvailabilityStatusText(current, editing)).toContain("Konflikt");
  });

  it("ranks available resources above occupied resources", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_B, KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const sorted = sortManipulationResourceAvailabilityForPicker(list);
    expect(sorted[0]!.resourceId).toBe(KR3_A.facilityResourceId);
    expect(sorted[1]!.resourceId).toBe(KR2_B.facilityResourceId);
  });

  it("recommends same-facility available half before other facility", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      pitchAllocations: [KR2_A],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_B, KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const recommended = pickRecommendedManipulationResourceId(list, KR2_A);
    expect(recommended).toBe(KR2_B.facilityResourceId);
  });

  it("recalculates availability when reservation window changes", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Spät",
      startAt: new Date("2026-09-20T16:00:00.000Z"),
      endAt: new Date("2026-09-20T17:30:00.000Z"),
      canonicalStartAt: new Date("2026-09-20T16:00:00.000Z"),
      canonicalEndAt: new Date("2026-09-20T17:30:00.000Z"),
      pitchAllocations: [KR3_A],
      conflicts: [],
    });
    const earlyWindow = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const lateWindow = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR3_A],
      reservationStartAt: new Date("2026-09-20T17:30:00.000Z"),
      reservationEndAt: new Date("2026-09-20T18:30:00.000Z"),
      resourceKind: "PITCH_HALL",
    });
    expect(earlyWindow[0]!.state).toBe("PARTIAL");
    expect(lateWindow[0]!.state).toBe("AVAILABLE");
  });

  it("blocks half pitches when Gesamt is occupied (hierarchy)", () => {
    const editing = matchBase({ pitchAllocations: [KR3_A], conflicts: [] });
    const wholeOccupant = matchBase({
      id: "match:whole",
      eventId: "ev-whole",
      pitchAllocations: [KR2_FULL],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, wholeOccupant],
      editingItem: editing,
      currentResourceId: KR3_A.facilityResourceId,
      resourceOptions: [KR2_A, KR2_B],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    expect(list.every((e) => e.state === "OCCUPIED")).toBe(true);
  });

  it("blocks Gesamt when a half pitch is occupied", () => {
    const editing = matchBase({ pitchAllocations: [KR3_A], conflicts: [] });
    const halfOccupant = matchBase({
      id: "match:half",
      eventId: "ev-half",
      pitchAllocations: [KR2_A],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, halfOccupant],
      editingItem: editing,
      currentResourceId: KR3_A.facilityResourceId,
      resourceOptions: [KR2_FULL],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    expect(list[0]!.state).toBe("OCCUPIED");
  });

  it("keeps independent sibling half available when only the other half is occupied", () => {
    const editing = matchBase({ pitchAllocations: [KR3_A], conflicts: [] });
    const halfA = matchBase({
      id: "match:half-a",
      eventId: "ev-a",
      pitchAllocations: [KR2_A],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, halfA],
      editingItem: editing,
      currentResourceId: KR3_A.facilityResourceId,
      resourceOptions: [KR2_B],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    expect(list[0]!.state).toBe("AVAILABLE");
  });

  it("board lines distinguish current conflict and recommended free", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      pitchAllocations: [KR2_B],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: KR2_A.facilityResourceId,
      resourceOptions: [KR2_A, KR2_B, KR3_A],
      reservationStartAt: reservationStart,
      reservationEndAt: reservationEnd,
      resourceKind: "PITCH_HALL",
    });
    const current = list.find((e) => e.resourceId === KR2_A.facilityResourceId)!;
    const recommended = list.find((e) => e.isRecommended)!;
    expect(manipulationResourceAvailabilityBoardLines(current, editing)).toEqual(["Aktuell", "Konflikt"]);
    expect(manipulationResourceAvailabilityBoardLines(recommended, editing)).toEqual([
      "Empfohlen",
      "Frei",
    ]);
    expect(manipulationResourceAvailabilityCellSelectable(recommended)).toBe(true);
    expect(manipulationResourceAvailabilityCellSelectable(current)).toBe(false);
  });

  it("uses shared dressing-room availability model", () => {
    const editing = matchBase({});
    const other = matchBase({
      id: "match:other",
      eventId: "ev-other",
      title: "Gast",
      dressingRoomAllocations: [E1],
      conflicts: [],
    });
    const list = buildManipulationResourceAvailabilityList({
      allItems: [editing, other],
      editingItem: editing,
      currentResourceId: E1.facilityResourceId,
      resourceOptions: [E1, E2],
      reservationStartAt: new Date("2026-09-20T14:00:00.000Z"),
      reservationEndAt: new Date("2026-09-20T16:00:00.000Z"),
      resourceKind: "DRESSING_ROOM",
    });
    const e1 = list.find((e) => e.resourceId === E1.facilityResourceId)!;
    const e2 = list.find((e) => e.resourceId === E2.facilityResourceId)!;
    expect(e1.state).toBe("OCCUPIED");
    expect(e2.state).toBe("AVAILABLE");
  });
});
