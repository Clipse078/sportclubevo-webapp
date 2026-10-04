import { describe, expect, it, vi } from "vitest";
import {
  assertActivityReschedulePermitted,
  ActivityRescheduleForbiddenError,
  applyPlanningHubActivityRescheduleDraft,
} from "../activity-rescheduling-mutations";
import {
  buildActivityRescheduleImpact,
  buildActivityRescheduleProposal,
  resolveActivityScheduleAuthority,
} from "../planning-activity-rescheduling";
import { getSchedulerManipulationCapabilities } from "../manipulation-capabilities";
import {
  evaluateManipulationConflicts,
  projectItemWithDraft,
} from "../manipulation-projection";
import { applyStandardPlanSchedulerDraft } from "../canonical-planning-mutations";
import type { SchedulerDraftChange } from "../scheduler-draft";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "pitch-1",
  facilityId: "f1",
  code: "KR2",
  name: "Kunstrasen 2",
  facilityName: "Sportanlage",
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 15,
};

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
    teamNames: ["F2"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: "sess-1",
    teamSeasonId: "ts1",
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    ...overrides,
  } as WeekplannerItem;
}

function matchItem(eventSource: string): WeekplannerItem {
  return {
    ...training({ type: "MATCH", eventId: "ev-1", trainingSessionId: undefined }),
    eventSource,
    opponentName: "Gegner",
    homeSide: { displayName: "FCA", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "Gegner", logoUrl: null, isOwnTeam: false },
    homeAway: "HOME",
    awayDressingRoomAllocations: [],
  } as WeekplannerItem;
}

describe("SCE-PLANNER-UX-08-03 activity rescheduling", () => {
  it("preserves pitch buffer minutes when activity time moves", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-20T16:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:30:00.000Z"),
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
    const impact = buildActivityRescheduleImpact(item, draft.proposedStart, draft.proposedEnd);
    expect(impact.resourceLines[0]?.beforeStart.toISOString()).toBe("2026-09-20T14:45:00.000Z");
    expect(impact.resourceLines[0]?.afterStart.toISOString()).toBe("2026-09-20T15:45:00.000Z");
  });

  it("SFV match is provider-managed and cannot reschedule on Standardplan", () => {
    const item = matchItem("SFV");
    const validation = resolveActivityScheduleAuthority(item, {
      isStandardplan: true,
      alternativePlanId: null,
    });
    expect(validation.permitted).toBe(false);
    expect(validation.authority).toBe("PROVIDER_MANAGED");
    const caps = getSchedulerManipulationCapabilities(item, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
      manipulationSurface: "kalender",
    });
    expect(caps.canMoveTime).toBe(false);
  });

  it("MANUAL match can reschedule on Standardplan kalender", () => {
    const item = matchItem("MANUAL");
    const caps = getSchedulerManipulationCapabilities(item, {
      isStandardplan: true,
      canManageTrainings: false,
      canManageEvents: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
      manipulationSurface: "kalender",
    });
    expect(caps.canMoveTime).toBe(true);
  });

  it("assertActivityReschedulePermitted rejects SFV match draft", () => {
    const item = matchItem("SFV");
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date(item.startAt.getTime() + 3_600_000),
      proposedEnd: new Date(item.endAt.getTime() + 3_600_000),
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
    expect(() =>
      assertActivityReschedulePermitted(draft, true, null),
    ).toThrow(ActivityRescheduleForbiddenError);
  });

  it("buildActivityRescheduleProposal uses activity time target", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-21T15:00:00.000Z"),
      proposedEnd: new Date("2026-09-21T16:30:00.000Z"),
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
    const proposal = buildActivityRescheduleProposal(draft, {
      isStandardplan: true,
      alternativePlanId: null,
    });
    expect(proposal?.timeTarget).toBe("activity");
    expect(proposal?.activityId).toBe("sess-1");
  });

  it("resource occupancy draft does not change activity startAt in projection", () => {
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T14:45:00.000Z"),
      originalEnd: new Date("2026-09-20T16:45:00.000Z"),
      proposedStart: new Date("2026-09-20T15:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:00:00.000Z"),
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item,
    };
    const projected = projectItemWithDraft(item, draft, null, "pitch");
    expect(projected.startAt).toEqual(item.startAt);
    expect(projected.endAt).toEqual(item.endAt);
  });

  it("DnD training move uses reschedule API via unified apply", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: item.startAt,
      originalEnd: item.endAt,
      proposedStart: new Date("2026-09-20T16:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:30:00.000Z"),
      manipulationType: "move",
      timeTarget: "activity",
      item,
    };
    await applyPlanningHubActivityRescheduleDraft(draft, {
      isStandardplan: true,
      alternativePlanId: null,
      resourceCategory: "pitch",
      facilityGroups: { PITCH_HALL: [], DRESSING_ROOM: [] },
      overridesByKey: {},
      timeZone: "Europe/Zurich",
    });
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/reschedule"))).toBe(true);
    vi.unstubAllGlobals();
  });

  it("08-02 regression: pitch occupancy move does not mutate activity time in apply path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    const item = training();
    const draft: SchedulerDraftChange = {
      itemId: item.id,
      originalStart: new Date("2026-09-20T14:45:00.000Z"),
      originalEnd: new Date("2026-09-20T16:45:00.000Z"),
      proposedStart: new Date("2026-09-20T15:00:00.000Z"),
      proposedEnd: new Date("2026-09-20T17:00:00.000Z"),
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item,
    };
    await applyStandardPlanSchedulerDraft(
      draft,
      "dressing",
      { PITCH_HALL: [], DRESSING_ROOM: [] },
      "Europe/Zurich",
    );
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("/reschedule"))).toBe(false);
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("dressing-room-occupancy")),
    ).toBe(true);
    vi.unstubAllGlobals();
  });

  it("conflict preview runs on projected activity geometry", () => {
    const a = training();
    const b = training({
      id: "training:b",
      trainingSessionId: "b",
    });
    const draft: SchedulerDraftChange = {
      itemId: a.id,
      originalStart: a.startAt,
      originalEnd: a.endAt,
      proposedStart: b.startAt,
      proposedEnd: b.endAt,
      manipulationType: "move",
      timeTarget: "activity",
      item: a,
    };
    const preview = evaluateManipulationConflicts([a, b], draft, null, "pitch");
    expect(preview.status).toBeDefined();
  });
});
