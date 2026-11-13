import { describe, expect, it } from "vitest";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";
import {
  coercePlanningInstant,
  reviveWeekplannerWeekFromTransport,
} from "@/lib/planning-hub/manipulation-transport";
import { weekplannerMatchToMatchcenterSummary } from "@/lib/planning-hub/weekplanner-match-matchcenter-bridge";

describe("weekplanner RSC date transport revival", () => {
  it("coercePlanningInstant accepts ISO strings from server props", () => {
    const iso = "2026-08-10T16:30:00.000Z";
    const revived = coercePlanningInstant(iso, "startAt");
    expect(revived).toBeInstanceOf(Date);
    expect(revived.toISOString()).toBe(iso);
  });

  it("reviveWeekplannerWeekFromTransport restores Date methods on items", () => {
    const isoStart = "2026-08-10T16:30:00.000Z";
    const isoEnd = "2026-08-10T18:00:00.000Z";
    const week = reviveWeekplannerWeekFromTransport({
      param: "2026-33",
      previousParam: "2026-32",
      nextParam: "2026-34",
      weekNumberLabel: "KW 33",
      rangeLabel: "range",
      days: [
        {
          dayKey: "2026-08-10",
          items: [
            {
              id: "match:e1",
              tenantId: "t1",
              type: "MATCH",
              startAt: isoStart,
              endAt: isoEnd,
              canonicalStartAt: isoStart,
              canonicalEndAt: isoEnd,
              timeOverridden: false,
              title: "Test",
              teamNames: ["Home"],
              opponentName: "Away",
              eventSource: "MANUAL",
              homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
              awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
              homeAway: "HOME",
              eventId: "e1",
              teamSeasonId: "ts-1",
              pitchAllocations: [],
              dressingRoomAllocations: [],
              canonicalPitchAllocations: [],
              canonicalDressingRoomAllocations: [],
              pitchOverridden: false,
              dressingRoomOverridden: false,
              awayDressingRoomAllocations: [],
              conflicts: [],
              dressingRoomOccupancyMode: "DEFAULT",
              dressingRoomOccupancyBeforeMinutes: null,
              dressingRoomOccupancyAfterMinutes: null,
              dressingRoomResolvedBeforeMinutes: 0,
              dressingRoomResolvedAfterMinutes: 0,
            } as unknown as WeekplannerMatchItem,
          ],
        },
      ],
    });

    const item = week.days[0]!.items[0]!;
    expect(typeof item.canonicalStartAt.toISOString).toBe("function");
    expect(item.canonicalStartAt.toISOString()).toBe(isoStart);
  });

  it("weekplannerMatchToMatchcenterSummary tolerates string instants on match items", () => {
    const summary = weekplannerMatchToMatchcenterSummary({
      id: "match:e1",
      tenantId: "t1",
      type: "MATCH",
      startAt: new Date("2026-08-10T16:30:00.000Z"),
      endAt: new Date("2026-08-10T18:00:00.000Z"),
      canonicalStartAt: "2026-08-10T16:30:00.000Z" as unknown as Date,
      canonicalEndAt: "2026-08-10T18:00:00.000Z" as unknown as Date,
      timeOverridden: false,
      title: "Test",
      teamNames: ["Home"],
      opponentName: "Away",
      eventSource: "MANUAL",
      homeSide: { displayName: "Home", logoUrl: null, isOwnTeam: true },
      awaySide: { displayName: "Away", logoUrl: null, isOwnTeam: false },
      homeAway: "HOME",
      eventId: "e1",
      teamSeasonId: "ts-1",
      pitchAllocations: [],
      dressingRoomAllocations: [],
      canonicalPitchAllocations: [],
      canonicalDressingRoomAllocations: [],
      pitchOverridden: false,
      dressingRoomOverridden: false,
      awayDressingRoomAllocations: [],
      conflicts: [],
      dressingRoomOccupancyMode: "DEFAULT",
      dressingRoomOccupancyBeforeMinutes: null,
      dressingRoomOccupancyAfterMinutes: null,
      dressingRoomResolvedBeforeMinutes: 0,
      dressingRoomResolvedAfterMinutes: 0,
    });

    expect(summary.startAt.toISOString()).toBe("2026-08-10T16:30:00.000Z");
    expect(summary.operationalEndAt?.toISOString()).toBe("2026-08-10T18:00:00.000Z");
  });
});
