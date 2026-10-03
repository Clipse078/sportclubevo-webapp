import { describe, expect, it, vi } from "vitest";
import type { FacilityGroup } from "@/components/admin/training/FacilityResourceSelector";
import { applyStandardPlanSchedulerDraft } from "../canonical-planning-mutations";
import {
  evaluateManipulationConflicts,
  projectItemWithDraft,
} from "../manipulation-projection";
import {
  isSyntheticCollapsedResourceId,
  manipulationFromSchedulerDraft,
  resolveProposedResourceDropTarget,
} from "../planning-resource-manipulation";
import { formatManipulationResourceLabel } from "../resource-timeline/planning-resource-groups";
import { buildPlanningResourceGroupsFromFacilityGroups } from "../resource-timeline/planning-resource-groups";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const ROOM_E1 = {
  facilityResourceId: "room-e1",
  facilityId: "f-dress",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

const ROOM_E2 = {
  facilityResourceId: "room-e2",
  facilityId: "f-dress",
  code: "E2",
  name: "E2",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 60,
  occupancyAfterMinutes: 45,
};

function matchWithDressing(room = ROOM_E1): WeekplannerItem {
  return {
    id: "match:m1",
    tenantId: "t1",
    type: "MATCH",
    eventId: "ev-1",
    startAt: new Date("2026-09-20T11:00:00.000Z"),
    endAt: new Date("2026-09-20T13:00:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T11:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T13:00:00.000Z"),
    timeOverridden: false,
    title: "Spiel",
    teamNames: ["D2"],
    pitchAllocations: [],
    dressingRoomAllocations: [room],
    awayDressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [room],
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

const DRESSING_FACILITY: FacilityGroup[] = [
  {
    facilityId: "f-dress",
    facilityName: "Garderobe",
    resources: [
      {
        id: ROOM_E1.facilityResourceId,
        name: "E1",
        code: "E1",
        type: "DRESSING_ROOM",
        facilityId: "f-dress",
        facilityName: "Garderobe",
      },
      {
        id: ROOM_E2.facilityResourceId,
        name: "E2",
        code: "E2",
        type: "DRESSING_ROOM",
        facilityId: "f-dress",
        facilityName: "Garderobe",
      },
    ],
  },
];

describe("SCE-PLANNER-UX-08-02 R1 — Garderobe regression", () => {
  it("E1 → E2 move projects dressing swap without changing Spielzeit", () => {
    const item = matchWithDressing();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T10:00:00.000Z"),
      originalEnd: new Date("2026-09-20T13:45:00.000Z"),
      proposedStart: new Date("2026-09-20T10:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T13:45:00.000Z"),
      originalResourceId: ROOM_E1.facilityResourceId,
      proposedResourceId: ROOM_E2.facilityResourceId,
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item,
    };
    const projected = projectItemWithDraft(item, draft, ROOM_E2, "dressing");
    expect(projected.startAt).toEqual(item.startAt);
    expect(projected.endAt).toEqual(item.endAt);
    expect(projected.dressingRoomAllocations[0]?.facilityResourceId).toBe("room-e2");
  });

  it("reservation-time move keeps match kickoff/end", () => {
    const item = matchWithDressing();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T10:00:00.000Z"),
      originalEnd: new Date("2026-09-20T13:45:00.000Z"),
      proposedStart: new Date("2026-09-20T09:45:00.000Z"),
      proposedEnd: new Date("2026-09-20T13:45:00.000Z"),
      manipulationType: "resize",
      timeTarget: "resourceOccupancy",
      item,
    };
    const projected = projectItemWithDraft(item, draft, null, "dressing");
    expect(projected.startAt).toEqual(item.startAt);
    expect(projected.dressingRoomResolvedBeforeMinutes).toBe(75);
  });

  it("combined E1 → E2 + reservation shift keeps activity time", () => {
    const item = matchWithDressing();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T10:00:00.000Z"),
      originalEnd: new Date("2026-09-20T13:45:00.000Z"),
      proposedStart: new Date("2026-09-20T09:30:00.000Z"),
      proposedEnd: new Date("2026-09-20T13:30:00.000Z"),
      originalResourceId: ROOM_E1.facilityResourceId,
      proposedResourceId: ROOM_E2.facilityResourceId,
      manipulationType: "combined",
      timeTarget: "resourceOccupancy",
      item,
    };
    const model = manipulationFromSchedulerDraft(draft, "dressing");
    expect(model.activityStart).toEqual(item.startAt);
    expect(model.activityEnd).toEqual(item.endAt);
    expect(model.targetFacilityResourceId).toBe("room-e2");
  });

  it("persists home dressing room code on E1 → E2 confirm", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const item = matchWithDressing();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T10:00:00.000Z"),
      originalEnd: new Date("2026-09-20T13:45:00.000Z"),
      proposedStart: new Date("2026-09-20T10:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T13:45:00.000Z"),
      originalResourceId: ROOM_E1.facilityResourceId,
      proposedResourceId: ROOM_E2.facilityResourceId,
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item,
    };
    await applyStandardPlanSchedulerDraft(
      draft,
      "dressing",
      { PITCH_HALL: [], DRESSING_ROOM: DRESSING_FACILITY },
      "Europe/Zurich",
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("homeDressingRoomCode");
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("E2");
    vi.unstubAllGlobals();
  });

  it("conflict validation runs for overlapping dressing occupancy", () => {
    const a = matchWithDressing();
    const b = matchWithDressing();
    b.id = "match:m2";
    b.eventId = "ev-2";
    const draft: SchedulerDraftChange = {
      itemId: a.id,
      originalStart: new Date("2026-09-20T10:00:00.000Z"),
      originalEnd: new Date("2026-09-20T13:45:00.000Z"),
      proposedStart: new Date("2026-09-20T10:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T13:45:00.000Z"),
      originalResourceId: ROOM_E1.facilityResourceId,
      proposedResourceId: ROOM_E2.facilityResourceId,
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item: a,
    };
    const preview = evaluateManipulationConflicts([a, b], draft, ROOM_E2, "dressing");
    expect(["valid", "warning"]).toContain(preview.status);
  });
});

describe("SCE-PLANNER-UX-08-02 R1 — collapsed pitch safety", () => {
  const known = new Set(["KR3-full", "KR3-a", "KR3-b"]);

  it("rejects __collapsed__* as drop targets", () => {
    expect(isSyntheticCollapsedResourceId("__collapsed__fac-kr3")).toBe(true);
    expect(
      resolveProposedResourceDropTarget({
        targetResourceId: "__collapsed__fac-kr3",
        originalResourceId: "KR3-full",
        canChangeResource: true,
        knownResourceIds: known,
      }),
    ).toBe("KR3-full");
  });

  it("does not implicitly pick segment A/B when hovering collapsed row", () => {
    for (const implicit of ["KR3-a", "KR3-b"]) {
      expect(
        resolveProposedResourceDropTarget({
          targetResourceId: "__collapsed__fac-kr3",
          originalResourceId: implicit,
          canChangeResource: true,
          knownResourceIds: known,
        }),
      ).toBe(implicit);
    }
  });

  it("accepts canonical FacilityResource id on expanded lanes", () => {
    expect(
      resolveProposedResourceDropTarget({
        targetResourceId: "KR3-a",
        originalResourceId: "KR3-full",
        canChangeResource: true,
        knownResourceIds: known,
      }),
    ).toBe("KR3-a");
  });
});

describe("SCE-PLANNER-UX-08-02 R1 — manipulation resource naming", () => {
  const fcaCatalog: FacilityGroup[] = [
    {
      facilityId: "fac-kr3",
      facilityName: "Kunstrasen 3",
      resources: [
        {
          id: "KR3-full",
          name: "Kunstrasen 3",
          code: "KR3",
          type: "FULL_PITCH",
          facilityId: "fac-kr3",
          facilityName: "Kunstrasen 3",
        },
        {
          id: "KR3-a",
          name: "Kunstrasen 3 A",
          code: "KR3_A",
          type: "HALF_PITCH",
          facilityId: "fac-kr3",
          facilityName: "Kunstrasen 3",
        },
        {
          id: "KR3-b",
          name: "Kunstrasen 3 B",
          code: "KR3_B",
          type: "HALF_PITCH",
          facilityId: "fac-kr3",
          facilityName: "Kunstrasen 3",
        },
      ],
    },
  ];

  it("formats Gesamt / A / B from canonical segment semantics", () => {
    const groups = buildPlanningResourceGroupsFromFacilityGroups(fcaCatalog, "pitch");
    expect(formatManipulationResourceLabel("KR3-full", groups, "Kunstrasen 3")).toBe(
      "Kunstrasen 3 · Gesamt",
    );
    expect(formatManipulationResourceLabel("KR3-a", groups, "Kunstrasen 3 A")).toBe(
      "Kunstrasen 3 · A",
    );
    expect(formatManipulationResourceLabel("KR3-b", groups, "Kunstrasen 3 B")).toBe(
      "Kunstrasen 3 · B",
    );
  });
});
