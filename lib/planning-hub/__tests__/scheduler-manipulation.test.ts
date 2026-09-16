import { describe, expect, it, vi } from "vitest";
import {
  getSchedulerManipulationCapabilities,
  hasAnyManipulationCapability,
} from "../manipulation-capabilities";
import {
  evaluateManipulationConflicts,
  projectItemWithDraft,
} from "../manipulation-projection";
import { isNoOpDraft, type SchedulerDraftChange } from "../scheduler-draft";
import {
  preserveDurationOnMove,
  resizeEndPreservingStart,
  snapMinutesFromMidnight,
  snapPixelDeltaToMinutes,
  SCHEDULER_SNAP_MINUTES,
} from "../scheduler/time-snap";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const PITCH_A = {
  facilityResourceId: "pitch-a",
  facilityId: "f1",
  code: "A",
  name: "Kunstrasen A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const PITCH_B = {
  facilityResourceId: "pitch-b",
  facilityId: "f1",
  code: "B",
  name: "Kunstrasen B",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(overrides: Partial<WeekplannerItem> = {}): WeekplannerItem {
  return {
    id: "training:t1",
    tenantId: "tenant",
    type: "TRAINING",
    startAt: new Date("2026-08-10T15:00:00.000Z"),
    endAt: new Date("2026-08-10T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-08-10T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-08-10T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["E2"],
    pitchAllocations: [PITCH_A],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH_A],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: "sess-1",
    teamSeasonId: "ts1",
    ...overrides,
  } as WeekplannerItem;
}

describe("time snap", () => {
  it("snaps to 15-minute increments", () => {
    expect(snapMinutesFromMidnight(17 * 60 + 3)).toBe(17 * 60);
    expect(snapMinutesFromMidnight(17 * 60 + 8)).toBe(17 * 60 + 15);
    expect(snapMinutesFromMidnight(17 * 60 + 22)).toBe(17 * 60 + 15);
    expect(snapMinutesFromMidnight(17 * 60 + 24)).toBe(17 * 60 + 30);
  });

  it("snaps pixel deltas", () => {
    expect(snapPixelDeltaToMinutes(30, 2)).toBe(15);
    expect(snapPixelDeltaToMinutes(0, 2)).toBe(0);
  });

  it("preserves duration on move", () => {
    const start = new Date("2026-08-10T15:00:00.000Z");
    const end = new Date("2026-08-10T16:30:00.000Z");
    const { startAt, endAt } = preserveDurationOnMove(
      start,
      end,
      17 * 60,
      "Europe/Zurich",
      start,
    );
    expect((endAt.getTime() - startAt.getTime()) / 60_000).toBe(90);
  });

  it("rejects invalid resize duration", () => {
    const start = new Date("2026-08-10T15:00:00.000Z");
    const result = resizeEndPreservingStart(start, 15 * 60, "Europe/Zurich", start);
    expect(result).toBeNull();
  });
});

describe("capabilities", () => {
  const item = training();

  it("read-only user receives no capability", () => {
    const caps = getSchedulerManipulationCapabilities(item, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: false,
      alternativePlanId: null,
      resourceCategory: "pitch",
      calendarTimeRange: "focused",
    });
    expect(hasAnyManipulationCapability(caps)).toBe(false);
  });

  it("authorized training user receives supported capabilities", () => {
    const caps = getSchedulerManipulationCapabilities(item, {
      isStandardplan: true,
      canManageTrainings: true,
      canManageEvents: false,
      alternativePlanId: null,
      resourceCategory: "pitch",
      calendarTimeRange: "focused",
    });
    expect(caps.canMoveTime).toBe(true);
    expect(caps.canResize).toBe(true);
    expect(caps.canChangePrimaryResource).toBe(true);
  });

  it("match standard plan cannot move time", () => {
    const match = training({ type: "MATCH", eventId: "e1" } as Partial<WeekplannerItem>);
    const caps = getSchedulerManipulationCapabilities(match, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
      calendarTimeRange: "focused",
    });
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canChangePrimaryResource).toBe(true);
  });

  it("veranstaltung has no capabilities", () => {
    const event = training({ type: "VERANSTALTUNG", eventId: "v1" } as Partial<WeekplannerItem>);
    const caps = getSchedulerManipulationCapabilities(event, {
      isStandardplan: true,
      canManageTrainings: true,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
      calendarTimeRange: "focused",
    });
    expect(hasAnyManipulationCapability(caps)).toBe(false);
  });

  it("alternative plan enables time move for match", () => {
    const match = training({ type: "MATCH", eventId: "e1" } as Partial<WeekplannerItem>);
    const caps = getSchedulerManipulationCapabilities(match, {
      isStandardplan: false,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: "plan-1",
      resourceCategory: "pitch",
      calendarTimeRange: "focused",
    });
    expect(caps.canMoveTime).toBe(true);
  });
});

describe("draft + conflicts", () => {
  it("detects no-op draft", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: item.startAt,
      proposedEnd: item.endAt,
      manipulationType: "move",
      item,
    };
    expect(isNoOpDraft(draft)).toBe(true);
  });

  it("projects resource swap on training", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: item.startAt,
      proposedEnd: item.endAt,
      originalResourceId: PITCH_A.facilityResourceId,
      proposedResourceId: PITCH_B.facilityResourceId,
      manipulationType: "combined",
      item,
    };
    const projected = projectItemWithDraft(item, draft, PITCH_B, "pitch");
    expect(projected.pitchAllocations[0]?.facilityResourceId).toBe("pitch-b");
  });

  it("warns when candidate creates a new resource conflict", () => {
    const a = training({ id: "training:a", trainingSessionId: "a", conflicts: [] });
    const b = training({
      id: "training:b",
      trainingSessionId: "b",
      startAt: new Date("2026-08-10T15:30:00.000Z"),
      endAt: new Date("2026-08-10T17:00:00.000Z"),
      canonicalStartAt: new Date("2026-08-10T15:30:00.000Z"),
      canonicalEndAt: new Date("2026-08-10T17:00:00.000Z"),
      pitchAllocations: [PITCH_A],
      canonicalPitchAllocations: [PITCH_A],
      conflicts: [],
    });
    const draft: SchedulerDraftChange = {
      itemId: a.id,
      originalStart: a.startAt,
      originalEnd: a.endAt,
      proposedStart: new Date("2026-08-10T15:30:00.000Z"),
      proposedEnd: new Date("2026-08-10T17:00:00.000Z"),
      manipulationType: "move",
      item: a,
    };
    const preview = evaluateManipulationConflicts([a, b], draft, null, "pitch");
    expect(preview.status).toBe("warning");
    expect(preview.newResourceConflictCount).toBeGreaterThan(0);
  });

  it("does not treat concurrent time on different resources as conflict", () => {
    const a = training();
    const b = training({
      id: "training:b",
      trainingSessionId: "b",
      pitchAllocations: [PITCH_B],
      canonicalPitchAllocations: [PITCH_B],
    });
    const draft: SchedulerDraftChange = {
      itemId: a.id,
      originalStart: a.startAt,
      originalEnd: a.endAt,
      proposedStart: new Date("2026-08-10T15:30:00.000Z"),
      proposedEnd: new Date("2026-08-10T17:00:00.000Z"),
      manipulationType: "move",
      item: a,
    };
    const preview = evaluateManipulationConflicts([a, b], draft, null, "pitch");
    expect(preview.status).toBe("valid");
  });
});

describe("canonical mutation apply", () => {
  it("calls reschedule exactly once on confirm path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { applyStandardPlanSchedulerDraft } = await import("../canonical-planning-mutations");
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-08-10T16:00:00.000Z"),
      proposedEnd: new Date("2026-08-10T17:30:00.000Z"),
      manipulationType: "move",
      item,
    };
    await applyStandardPlanSchedulerDraft(draft, "pitch", { PITCH_HALL: [], DRESSING_ROOM: [] }, "Europe/Zurich");
    const rescheduleCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/reschedule"),
    );
    expect(rescheduleCalls).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
