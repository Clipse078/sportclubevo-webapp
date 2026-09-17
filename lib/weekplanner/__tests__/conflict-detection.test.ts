import { describe, expect, it } from "vitest";
import { detectPairwiseWeekplannerConflicts } from "../conflict-detection";
import { facilityResourcesShareConflictCapacity } from "../pitch-capacity-overlap";
import type { WeekplannerMatchItem, WeekplannerResourceRef } from "../types";

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

const KR3_FULL: WeekplannerResourceRef = {
  facilityResourceId: "kr3-full",
  facilityId: "fac-kr3",
  code: "KR3",
  name: "Kunstrasen 3",
  facilityName: "Anlage",
  resourceType: "FULL_PITCH",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const O4: WeekplannerResourceRef = {
  facilityResourceId: "room-o4",
  facilityId: "fac-dress",
  code: "O4",
  name: "O4",
  facilityName: "Garderobe",
  resourceType: "DRESSING_ROOM",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
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

function matchBase(overrides: Partial<WeekplannerMatchItem>): WeekplannerMatchItem {
  const startAt = new Date("2026-09-20T07:30:00.000Z");
  const endAt = new Date("2026-09-20T09:30:00.000Z");
  return {
    id: "match:a",
    tenantId: "t1",
    type: "MATCH",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Junioren D-7 D2 vs FC Münchenstein b",
    teamNames: ["FC Allschwil Junioren D-7 D2"],
    opponentName: "FC Münchenstein b",
    homeAway: "HOME",
    eventId: "event-a",
    pitchAllocations: [KR3_FULL],
    dressingRoomAllocations: [O4],
    awayDressingRoomAllocations: [E1],
    canonicalPitchAllocations: [KR3_FULL],
    canonicalDressingRoomAllocations: [O4],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
    ...overrides,
  };
}

describe("facilityResourcesShareConflictCapacity", () => {
  it("does not treat Kunstrasen 2 and Kunstrasen 3 as shared capacity", () => {
    expect(facilityResourcesShareConflictCapacity(KR2_FULL, KR3_FULL)).toBe(false);
  });

  it("treats full pitch and half pitch within the same facility as shared capacity", () => {
    expect(facilityResourcesShareConflictCapacity(KR2_FULL, KR2_A)).toBe(true);
  });
});

describe("detectPairwiseWeekplannerConflicts", () => {
  it("never reports self-collision for the same canonical match event", () => {
    const item = matchBase({ id: "match:dup", eventId: "same-event" });
    const duplicateRow = matchBase({
      id: "match:dup-view",
      eventId: "same-event",
      pitchAllocations: [{ ...KR3_FULL, facilityResourceId: "kr3-view" }],
    });
    const map = detectPairwiseWeekplannerConflicts([item, duplicateRow]);
    expect(map.size).toBe(0);
  });

  it("does not flag pitch conflict when only Kunstrasen 2 is occupied elsewhere", () => {
    const d7 = matchBase({ id: "match:d7", eventId: "d7" });
    const otherPitch = matchBase({
      id: "match:turnier",
      eventId: "turnier",
      startAt: new Date("2026-09-20T08:00:00.000Z"),
      endAt: new Date("2026-09-20T10:00:00.000Z"),
      pitchAllocations: [KR2_FULL],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
    });
    const map = detectPairwiseWeekplannerConflicts([d7, otherPitch]);
    expect(map.get(d7.id)?.size ?? 0).toBe(0);
  });

  it("flags parent/child pitch overlap within one facility", () => {
    const whole = matchBase({
      id: "match:whole",
      eventId: "whole",
      pitchAllocations: [KR2_FULL],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
    });
    const half = matchBase({
      id: "match:half",
      eventId: "half",
      pitchAllocations: [KR2_A],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
    });
    const map = detectPairwiseWeekplannerConflicts([whole, half]);
    expect(map.get(whole.id)?.size).toBeGreaterThan(0);
    const conflict = [...(map.get(whole.id)?.values() ?? [])][0];
    expect(conflict?.resourceKind).toBe("PITCH_HALL");
  });

  it("detects dressing-room buffer overlap for Junioren D-7 vs FF-17 (STAGE-accurate times)", () => {
    // STAGE: D-7 09:30–11:30 local; FF-17 13:00–15:00 local (not 11:00–13:00).
    // Dressing 60/45 → overlap on O4/E1 is 12:00–12:15 local = 15 minutes.
    const d7 = matchBase({ id: "match:d7", eventId: "d7" });
    const ff17 = matchBase({
      id: "match:ff17",
      eventId: "ff17",
      title: "Juniorinnen FF-17 vs FC Arlesheim",
      startAt: new Date("2026-09-20T11:00:00.000Z"),
      endAt: new Date("2026-09-20T13:00:00.000Z"),
      canonicalStartAt: new Date("2026-09-20T11:00:00.000Z"),
      canonicalEndAt: new Date("2026-09-20T13:00:00.000Z"),
      pitchAllocations: [
        {
          ...KR2_FULL,
          occupancyBeforeMinutes: 0,
          occupancyAfterMinutes: 0,
        },
      ],
      dressingRoomAllocations: [O4],
      awayDressingRoomAllocations: [E1],
    });

    const map = detectPairwiseWeekplannerConflicts([d7, ff17]);
    const d7Conflicts = [...(map.get(d7.id)?.values() ?? [])];
    expect(d7Conflicts.length).toBeGreaterThanOrEqual(2);
    expect(d7Conflicts.every((c) => c.resourceKind === "DRESSING_ROOM")).toBe(true);
    expect(d7Conflicts.some((c) => c.facilityResourceName === "O4")).toBe(true);
    expect(d7Conflicts.some((c) => c.facilityResourceName === "E1")).toBe(true);
    expect(d7Conflicts[0]?.partnerTitle).toContain("FF-17");
    const o4Conflict = d7Conflicts.find((c) => c.facilityResourceName === "O4");
    expect(o4Conflict?.overlapStartAt?.toISOString()).toBe("2026-09-20T10:00:00.000Z");
    expect(o4Conflict?.overlapEndAt?.toISOString()).toBe("2026-09-20T10:15:00.000Z");
    const overlapMinutes =
      (o4Conflict!.overlapEndAt!.getTime() - o4Conflict!.overlapStartAt!.getTime()) / 60_000;
    expect(overlapMinutes).toBe(15);
  });

  it("does not emit dressing-room conflict when buffers do not overlap", () => {
    const early = matchBase({
      id: "match:early",
      eventId: "early",
      startAt: new Date("2026-09-20T05:00:00.000Z"),
      endAt: new Date("2026-09-20T07:00:00.000Z"),
      canonicalStartAt: new Date("2026-09-20T05:00:00.000Z"),
      canonicalEndAt: new Date("2026-09-20T07:00:00.000Z"),
    });
    const late = matchBase({
      id: "match:late",
      eventId: "late",
      startAt: new Date("2026-09-20T10:00:00.000Z"),
      endAt: new Date("2026-09-20T12:00:00.000Z"),
      canonicalStartAt: new Date("2026-09-20T10:00:00.000Z"),
      canonicalEndAt: new Date("2026-09-20T12:00:00.000Z"),
    });
    const map = detectPairwiseWeekplannerConflicts([early, late]);
    expect(map.size).toBe(0);
  });

  it("uses explicit activity interval for pitch overlap (not dressing buffer on pitch)", () => {
    const a = matchBase({
      id: "match:a",
      eventId: "a",
      startAt: new Date("2026-09-20T07:30:00.000Z"),
      endAt: new Date("2026-09-20T09:30:00.000Z"),
      pitchAllocations: [{ ...KR3_FULL, occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
    });
    const b = matchBase({
      id: "match:b",
      eventId: "b",
      startAt: new Date("2026-09-20T09:30:00.000Z"),
      endAt: new Date("2026-09-20T11:30:00.000Z"),
      pitchAllocations: [{ ...KR3_FULL, occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
      dressingRoomAllocations: [],
      awayDressingRoomAllocations: [],
    });
    const map = detectPairwiseWeekplannerConflicts([a, b]);
    expect(map.size).toBe(0);
  });
});
