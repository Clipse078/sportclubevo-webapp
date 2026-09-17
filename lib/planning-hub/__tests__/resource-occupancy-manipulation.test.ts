import { describe, expect, it, vi } from "vitest";
import {
  getSchedulerManipulationCapabilities,
} from "../manipulation-capabilities";
import { projectItemWithDraft } from "../manipulation-projection";
import { applyStandardPlanSchedulerDraft } from "../canonical-planning-mutations";
import {
  applyDressingOccupancyBuffersToItem,
  buffersFromOccupancyInterval,
} from "../scheduler/resource-occupancy-manipulation";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const ROOM_E1 = {
  facilityResourceId: "room-e1",
  facilityId: "f1",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

function matchItem(): WeekplannerItem {
  return {
    id: "match:m1",
    tenantId: "t1",
    type: "MATCH",
    eventId: "ev-1",
    startAt: new Date("2026-09-20T07:30:00.000Z"),
    endAt: new Date("2026-09-20T09:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T07:30:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T09:30:00.000Z"),
    timeOverridden: false,
    title: "D2 vs Münchenstein",
    teamNames: ["Junioren D-7 D2"],
    pitchAllocations: [],
    dressingRoomAllocations: [ROOM_E1],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [ROOM_E1],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 60,
    dressingRoomResolvedAfterMinutes: 45,
  } as WeekplannerItem;
}

describe("PLANNING-HUB-03B resource occupancy", () => {
  it("standardplan MATCH cannot change official activity time in Kalender caps", () => {
    const caps = getSchedulerManipulationCapabilities(matchItem(), {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
    });
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canResize).toBe(false);
  });

  it("standardplan MATCH CAN manipulate dressing occupancy in Ressourcen view", () => {
    const caps = getSchedulerManipulationCapabilities(matchItem(), {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "dressing",
    });
    expect(caps.canMoveResourceOccupancy).toBe(true);
    expect(caps.canChangeResourceOccupancyStart).toBe(true);
    expect(caps.canChangeResourceOccupancyEnd).toBe(true);
    expect(caps.canMoveTime).toBe(false);
  });

  it("derives before/after buffers from occupancy interval", () => {
    const item = matchItem();
    const occupancyStart = new Date("2026-09-20T06:15:00.000Z");
    const occupancyEnd = new Date("2026-09-20T10:30:00.000Z");
    const buffers = buffersFromOccupancyInterval(
      item.startAt,
      item.endAt,
      occupancyStart,
      occupancyEnd,
    );
    expect(buffers.beforeMinutes).toBe(75);
    expect(buffers.afterMinutes).toBe(60);
  });

  it("projects occupancy resize without changing match kickoff", () => {
    const item = matchItem();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T06:30:00.000Z"),
      originalEnd: new Date("2026-09-20T10:15:00.000Z"),
      proposedStart: new Date("2026-09-20T06:15:00.000Z"),
      proposedEnd: new Date("2026-09-20T10:15:00.000Z"),
      manipulationType: "resize",
      timeTarget: "resourceOccupancy",
      item,
    };
    const projected = projectItemWithDraft(item, draft, null, "dressing");
    expect(projected.startAt).toEqual(item.startAt);
    expect(projected.endAt).toEqual(item.endAt);
    expect(projected.dressingRoomResolvedBeforeMinutes).toBe(75);
    expect(projected.dressingRoomOccupancyMode).toBe("CUSTOM");
  });

  it("persists CUSTOM occupancy via matchcenter PATCH on confirm", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const item = matchItem();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T06:30:00.000Z"),
      originalEnd: new Date("2026-09-20T10:15:00.000Z"),
      proposedStart: new Date("2026-09-20T06:15:00.000Z"),
      proposedEnd: new Date("2026-09-20T10:30:00.000Z"),
      manipulationType: "resize",
      timeTarget: "resourceOccupancy",
      item,
    };
    await applyStandardPlanSchedulerDraft(draft, "dressing", { PITCH_HALL: [], DRESSING_ROOM: [] }, "Europe/Zurich");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("dressingRoomOccupancyMode");
    expect(String(init.body)).toContain("CUSTOM");
    vi.unstubAllGlobals();
  });

  it("applyDressingOccupancyBuffersToItem keeps DEFAULT when unchanged", () => {
    const item = matchItem();
    const next = applyDressingOccupancyBuffersToItem(item, 60, 45);
    expect(next.dressingRoomOccupancyMode).toBe("DEFAULT");
  });
});
