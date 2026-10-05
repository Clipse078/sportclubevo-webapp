import { describe, expect, it } from "vitest";
import {
  buildConflictResolutionFeedback,
  deriveConflictResolutionCapabilities,
  filterConflictIncidents,
} from "../conflict-resolution";
import type { PlanningConflictIncident } from "../conflict-attention";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "pitch-1",
  facilityId: "f1",
  code: "A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const ROOM = {
  facilityResourceId: "room-1",
  facilityId: "f2",
  code: "E1",
  name: "E1",
  facilityName: "G",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(id: string, extra?: Partial<WeekplannerTrainingItem>): WeekplannerTrainingItem {
  const startAt = new Date("2026-09-16T16:45:00.000Z");
  const endAt = new Date("2026-09-16T18:15:00.000Z");
  return {
    id,
    tenantId: "t1",
    type: "TRAINING",
    startAt,
    endAt,
    canonicalStartAt: startAt,
    canonicalEndAt: endAt,
    timeOverridden: false,
    title: "Training",
    teamNames: ["Team"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [ROOM],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [ROOM],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
    ...extra,
  };
}

const ctx = {
  canManageTrainings: true,
  canManageEvents: false,
  canManageAllocations: true,
  isStandardplan: true,
  alternativePlanId: null as string | null,
};

describe("SCE-PLANNER-UX-08-05 conflict resolution capabilities", () => {
  it("A — pitch conflict exposes primary resource and time actions when permitted", () => {
    const item = training("training:a", {
      conflicts: [
        {
          facilityResourceId: PITCH.facilityResourceId,
          facilityResourceName: PITCH.name,
          resourceKind: "PITCH_HALL",
        },
      ],
    });
    const caps = deriveConflictResolutionCapabilities(item, ctx);
    expect(caps.canChangePrimaryResource).toBe(true);
    expect(caps.canMoveActivityTime).toBe(true);
    expect(caps.canChangeSupportingResource).toBe(true);
  });

  it("B — dressing-room conflict exposes supporting resource action", () => {
    const item = training("training:b", {
      conflicts: [
        {
          facilityResourceId: ROOM.facilityResourceId,
          facilityResourceName: ROOM.name,
          resourceKind: "DRESSING_ROOM",
        },
      ],
    });
    const caps = deriveConflictResolutionCapabilities(item, ctx);
    expect(caps.canChangeSupportingResource).toBe(true);
  });

  it("C — actor without mutation capability receives no mutation flags", () => {
    const item = training("training:c", {
      conflicts: [{ facilityResourceId: PITCH.facilityResourceId, facilityResourceName: PITCH.name }],
    });
    const caps = deriveConflictResolutionCapabilities(item, {
      ...ctx,
      canManageTrainings: false,
      canManageAllocations: false,
    });
    expect(caps.canMoveActivityTime).toBe(false);
    expect(caps.canChangePrimaryResource).toBe(false);
    expect(caps.canChangeSupportingResource).toBe(false);
  });

  it("D — SFV provider-managed match blocks activity time", () => {
    const item = {
      ...training("match:a"),
      id: "match:a",
      type: "MATCH" as const,
      eventId: "ev1",
      eventSource: "SFV",
      opponentName: "Gast",
      homeSide: { displayName: "Heim", logoUrl: null, isOwnTeam: true },
      awaySide: { displayName: "Gast", logoUrl: null, isOwnTeam: false },
      homeAway: "HOME" as const,
      awayDressingRoomAllocations: [],
    };
    const caps = deriveConflictResolutionCapabilities(item, {
      ...ctx,
      canManageEvents: true,
    });
    expect(caps.canMoveActivityTime).toBe(false);
    expect(caps.activityTimeBlockedReason).toMatch(/Verband/);
  });

  it("E — provider match may still allow local resource resolution", () => {
    const item = {
      ...training("match:b"),
      id: "match:b",
      type: "MATCH" as const,
      eventId: "ev2",
      eventSource: "SFV",
      opponentName: "Gast",
      homeSide: { displayName: "Heim", logoUrl: null, isOwnTeam: true },
      awaySide: { displayName: "Gast", logoUrl: null, isOwnTeam: false },
      homeAway: "HOME" as const,
      awayDressingRoomAllocations: [],
    };
    const caps = deriveConflictResolutionCapabilities(item, {
      ...ctx,
      canManageEvents: true,
    });
    expect(caps.canChangePrimaryResource).toBe(true);
  });

  it("I — partial resolution feedback when one conflict remains", () => {
    const before = training("x", {
      conflicts: [
        { facilityResourceId: PITCH.facilityResourceId, facilityResourceName: PITCH.name, resourceKind: "PITCH_HALL" },
        { facilityResourceId: ROOM.facilityResourceId, facilityResourceName: ROOM.name, resourceKind: "DRESSING_ROOM" },
      ],
    });
    const after = training("x", {
      conflicts: [
        { facilityResourceId: ROOM.facilityResourceId, facilityResourceName: ROOM.name, resourceKind: "DRESSING_ROOM" },
      ],
    });
    const fb = buildConflictResolutionFeedback(before, after, before.conflicts[0]!);
    expect(fb?.kind).toBe("partial");
    if (fb?.kind === "partial") {
      expect(fb.remainingCount).toBe(1);
    }
  });

  it("K — incident filter aligns with canonical incident list semantics", () => {
    const incident: PlanningConflictIncident = {
      id: "pitch-1|1|2",
      facilityResourceId: PITCH.facilityResourceId,
      facilityResourceName: PITCH.name,
      resourceKind: "PITCH_HALL",
      dayKey: "2026-09-16",
      startAt: new Date("2026-09-16T16:45:00.000Z"),
      endAt: new Date("2026-09-16T18:15:00.000Z"),
      occupancyCount: 2,
      itemIds: ["training:a", "training:b"],
    };
    const itemsById = new Map([
      ["training:a", training("training:a")],
      ["training:b", training("training:b", { teamNames: ["Andere"] })],
    ]);
    const pitchOnly = filterConflictIncidents([incident], {
      query: "",
      kind: "PITCH_HALL",
      itemsById,
    });
    expect(pitchOnly).toHaveLength(1);
    const none = filterConflictIncidents([incident], {
      query: "zzznomatch",
      kind: "all",
      itemsById,
    });
    expect(none).toHaveLength(0);
  });
});
