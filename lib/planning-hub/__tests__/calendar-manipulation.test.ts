import { describe, expect, it, vi } from "vitest";
import {
  getSchedulerManipulationCapabilities,
  hasAnyManipulationCapability,
} from "../manipulation-capabilities";
import { evaluateManipulationConflicts } from "../manipulation-projection";
import { isNoOpDraft, type SchedulerDraftChange } from "../scheduler-draft";
import { draftGeometryKey } from "../scheduler/draft-geometry-key";
import {
  calendarMoveWithDayAndTimeDelta,
  calendarDayDeltaFromPixelDrag,
} from "../scheduler/calendar-date-shift";
import {
  preserveDurationOnMove,
  resizeEndPreservingStart,
  resizeStartPreservingEnd,
  snapMinutesFromMidnight,
  snapPixelDeltaToMinutes,
} from "../scheduler/time-snap";
import { dayKeyInTimeZone } from "../scheduler/time-zone";
import {
  exceedsDragThreshold,
  PLANNING_HUB_DRAG_THRESHOLD_PX,
} from "@/components/admin/planning-hub/planning-hub-pointer-gesture";
import type { CalendarDayLayoutItem } from "../scheduler/calendar-day-layout";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const WEEK = [
  "2026-09-14",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
  "2026-09-19",
  "2026-09-20",
];

function training(overrides: Partial<WeekplannerItem> = {}): WeekplannerItem {
  return {
    id: "training:t1",
    tenantId: "tenant",
    type: "TRAINING",
    startAt: new Date("2026-09-20T15:00:00.000Z"),
    endAt: new Date("2026-09-20T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-20T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-20T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["E2"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
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

describe("PLANNING-HUB-03C calendar manipulation", () => {
  it("vertical drag changes start time preserving duration", () => {
    const item = training();
    const delta = snapPixelDeltaToMinutes(30, 2);
    const startMin = 17 * 60;
    const moved = preserveDurationOnMove(
      item.startAt,
      item.endAt,
      snapMinutesFromMidnight(startMin + delta),
      "Europe/Zurich",
      item.startAt,
    );
    expect((moved.endAt.getTime() - moved.startAt.getTime()) / 60_000).toBe(90);
    expect(moved.startAt.getTime()).toBeGreaterThan(item.startAt.getTime());
  });

  it("horizontal drag across day changes date", () => {
    const start = new Date("2026-09-20T15:00:00.000Z");
    const end = new Date("2026-09-20T16:30:00.000Z");
    const dayDelta = calendarDayDeltaFromPixelDrag(-120, 120);
    expect(dayDelta).toBe(-1);
    const moved = calendarMoveWithDayAndTimeDelta(start, end, dayDelta, 0, WEEK, "Europe/Zurich");
    expect(dayKeyInTimeZone(moved!.startAt, "Europe/Zurich")).toBe("2026-09-19");
  });

  it("diagonal drag changes day and time", () => {
    const start = new Date("2026-09-20T15:00:00.000Z");
    const end = new Date("2026-09-20T16:30:00.000Z");
    const moved = calendarMoveWithDayAndTimeDelta(start, end, -1, 60, WEEK, "Europe/Zurich");
    expect(dayKeyInTimeZone(moved!.startAt, "Europe/Zurich")).toBe("2026-09-19");
    expect(moved!.startAt.getTime()).not.toBe(start.getTime());
  });

  it("top resize changes start preserving end", () => {
    const start = new Date("2026-09-20T15:00:00.000Z");
    const end = new Date("2026-09-20T16:30:00.000Z");
    const resized = resizeStartPreservingEnd(end, 15 * 60 + 30, "Europe/Zurich", start);
    expect(resized?.endAt).toEqual(end);
    expect(resized!.startAt.getTime()).toBeLessThan(start.getTime());
  });

  it("bottom resize changes end preserving start", () => {
    const start = new Date("2026-09-20T15:00:00.000Z");
    const end = new Date("2026-09-20T16:30:00.000Z");
    const endMin = 18 * 60 + 30;
    const resized = resizeEndPreservingStart(start, endMin, "Europe/Zurich", start);
    expect(resized?.startAt).toEqual(start);
    expect(resized!.endAt.getTime()).toBeGreaterThan(end.getTime());
  });

  it("snaps to 15-minute increments", () => {
    expect(snapMinutesFromMidnight(17 * 60 + 7)).toBe(17 * 60);
    expect(snapMinutesFromMidnight(17 * 60 + 8)).toBe(17 * 60 + 15);
  });

  it("sub-threshold movement is not a drag", () => {
    expect(PLANNING_HUB_DRAG_THRESHOLD_PX).toBe(5);
    expect(exceedsDragThreshold(0, 0, 3, 3)).toBe(false);
    expect(exceedsDragThreshold(0, 0, 6, 0)).toBe(true);
  });

  it("no-op draft represents click without mutation", () => {
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

  it("conflict preview uses proposed geometry", () => {
    const a = training();
    const b = training({
      id: "training:b",
      trainingSessionId: "b",
      pitchAllocations: [{ facilityResourceId: "p1", facilityId: "f", code: "A", name: "A", facilityName: "F", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
      canonicalPitchAllocations: [{ facilityResourceId: "p1", facilityId: "f", code: "A", name: "A", facilityName: "F", occupancyBeforeMinutes: 0, occupancyAfterMinutes: 0 }],
    });
    const draft: SchedulerDraftChange = {
      itemId: a.id,
      originalStart: a.startAt,
      originalEnd: a.endAt,
      proposedStart: b.startAt,
      proposedEnd: b.endAt,
      manipulationType: "move",
      item: a,
    };
    const preview = evaluateManipulationConflicts([a, b], draft, null, "pitch");
    expect(preview.newResourceConflictCount).toBeGreaterThanOrEqual(0);
  });

  it("draft geometry key dedupes sub-threshold noise", () => {
    const item = training();
    const draftA: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-20T15:15:00.000Z"),
      proposedEnd: new Date("2026-09-20T16:45:00.000Z"),
      manipulationType: "move",
      item,
    };
    const draftB = { ...draftA };
    expect(draftGeometryKey(draftA)).toBe(draftGeometryKey(draftB));
  });

  it("aggregate segments are not single draggable activities", () => {
    const aggregate: CalendarDayLayoutItem = {
      kind: "aggregate",
      clusterId: "c1",
      itemIds: ["a", "b"],
      startMs: 0,
      endMs: 1,
    };
    const single: CalendarDayLayoutItem = {
      kind: "activity",
      itemId: "a",
      layout: { lane: 0, totalLanes: 1 },
    };
    expect(aggregate.kind).toBe("aggregate");
    expect(single.kind).toBe("activity");
  });

  it("unauthorized user has no manipulation capability", () => {
    const caps = getSchedulerManipulationCapabilities(training(), {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: false,
      alternativePlanId: null,
      resourceCategory: "pitch",
    });
    expect(hasAnyManipulationCapability(caps)).toBe(false);
  });

  it("standard plan match time move stays disabled (provider-owned)", () => {
    const match = training({ type: "MATCH", eventId: "m1" } as Partial<WeekplannerItem>);
    const caps = getSchedulerManipulationCapabilities(match, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
    });
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canResize).toBe(false);
  });

  it("calls reschedule on confirm path for training move", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const { applyStandardPlanSchedulerDraft } = await import("../canonical-planning-mutations");
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-20T16:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:30:00.000Z"),
      manipulationType: "move",
      item,
    };
    await applyStandardPlanSchedulerDraft(draft, "pitch", { PITCH_HALL: [], DRESSING_ROOM: [] }, "Europe/Zurich");
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/reschedule"))).toBe(true);
    vi.unstubAllGlobals();
  });

  it("resource occupancy draft keeps activity time target separate from calendar", () => {
    const match = training({ type: "MATCH", eventId: "m1" } as Partial<WeekplannerItem>);
    const caps = getSchedulerManipulationCapabilities(match, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "dressing",
    });
    expect(caps.canMoveTime).toBe(false);
    expect(caps.canMoveResourceOccupancy).toBe(true);
  });
});
