import { describe, expect, it, vi } from "vitest";
import { buildPlanningConflictIncidents } from "@/lib/planning-hub/conflict-attention";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import { applyStandardPlanSchedulerDraft } from "@/lib/planning-hub/canonical-planning-mutations";
import { projectItemWithDraft } from "@/lib/planning-hub/manipulation-projection";
import { reconcileSelectedConflictIncidentId } from "@/lib/planning-hub/conflict-resolution-workspace";
import type { SchedulerDraftChange } from "@/lib/planning-hub/scheduler-draft";
import type { WeekplannerItem, WeekplannerWeek } from "@/lib/weekplanner/types";

const KUNSTRASEN_2_A = {
  facilityResourceId: "pitch-kr2-a",
  facilityId: "fac-kr2",
  code: "KR2-A",
  name: "A",
  facilityName: "Kunstrasen 2",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const HAUPTFELD_A = {
  facilityResourceId: "pitch-hf-a",
  facilityId: "fac-hf",
  code: "HF-A",
  name: "A",
  facilityName: "Hauptfeld",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const DRESSING = {
  facilityResourceId: "room-1",
  facilityId: "fac-dress",
  code: "G1",
  name: "G1",
  facilityName: "Garderobe",
  resourceType: "DRESSING_ROOM" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 15,
};

function trainingItem(overrides: {
  id: string;
  sessionId: string;
  title: string;
  pitch: typeof KUNSTRASEN_2_A;
}): WeekplannerItem {
  return {
    id: overrides.id,
    tenantId: "tenant-a",
    type: "TRAINING",
    trainingSessionId: overrides.sessionId,
    trainingSeriesId: `series-${overrides.sessionId}`,
    teamSeasonId: "team-season-1",
    startAt: new Date("2026-09-17T15:00:00.000Z"),
    endAt: new Date("2026-09-17T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-09-17T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-09-17T16:30:00.000Z"),
    timeOverridden: false,
    title: overrides.title,
    teamNames: [overrides.title],
    pitchAllocations: [overrides.pitch],
    dressingRoomAllocations: [DRESSING],
    canonicalPitchAllocations: [overrides.pitch],
    canonicalDressingRoomAllocations: [DRESSING],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
  } as WeekplannerItem;
}

function weekWithItems(items: WeekplannerItem[]): WeekplannerWeek {
  return {
    param: "2026-09-14",
    previousParam: "2026-09-07",
    nextParam: "2026-09-21",
    days: [{ dayKey: "2026-09-17", items }],
  };
}

describe("SCE-PLANNER-UX-08-05R5 read-after-write", () => {
  it("reconciles selected incident when the resolved incident disappears", () => {
    const incidents = [
      { id: "a", facilityResourceId: "r1" },
      { id: "b", facilityResourceId: "r2" },
    ] as const;
    expect(
      reconcileSelectedConflictIncidentId("a", incidents as never, incidents as never),
    ).toBe("a");
    expect(
      reconcileSelectedConflictIncidentId("a", [{ id: "b" }] as never, [{ id: "b" }] as never),
    ).toBe("b");
  });

  it("F2 pitch move removes Kunstrasen 2 A F1/F2 incident and keeps dressing + sport time", async () => {
    const f1 = trainingItem({
      id: "training:f1",
      sessionId: "session-f1",
      title: "Junioren F1",
      pitch: KUNSTRASEN_2_A,
    });
    const f2 = trainingItem({
      id: "training:f2",
      sessionId: "session-f2",
      title: "Junioren F2",
      pitch: KUNSTRASEN_2_A,
    });

    const beforeItems = annotateWeekplannerConflicts([f1, f2]);
    const beforeIncidents = buildPlanningConflictIncidents(weekWithItems(beforeItems));
    const pitchIncidentsBefore = beforeIncidents.filter(
      (incident) => incident.resourceKind === "PITCH_HALL",
    );
    expect(pitchIncidentsBefore).toHaveLength(1);
    expect(pitchIncidentsBefore[0]?.facilityResourceId).toBe(KUNSTRASEN_2_A.facilityResourceId);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        sessionId: "session-f2",
        targetResourceId: HAUPTFELD_A.facilityResourceId,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const draft: SchedulerDraftChange = {
      itemId: f2.id,
      segmentId: `${f2.id}:${KUNSTRASEN_2_A.facilityResourceId}`,
      originalStart: f2.startAt,
      originalEnd: f2.endAt,
      proposedStart: f2.startAt,
      proposedEnd: f2.endAt,
      originalResourceId: KUNSTRASEN_2_A.facilityResourceId,
      proposedResourceId: HAUPTFELD_A.facilityResourceId,
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item: f2,
    };

    const result = await applyStandardPlanSchedulerDraft(
      draft,
      "pitch",
      { PITCH_HALL: [], DRESSING_ROOM: [] },
      "Europe/Zurich",
    );
    expect(result.applied).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/training/planning-grid/reassign");

    const projectedF2 = projectItemWithDraft(f2, draft, HAUPTFELD_A, "pitch");
    expect(projectedF2.pitchAllocations[0]?.facilityResourceId).toBe(HAUPTFELD_A.facilityResourceId);
    expect(projectedF2.dressingRoomAllocations[0]?.facilityResourceId).toBe(DRESSING.facilityResourceId);
    expect(projectedF2.startAt).toEqual(f2.startAt);
    expect(projectedF2.endAt).toEqual(f2.endAt);

    const afterItems = annotateWeekplannerConflicts([f1, { ...projectedF2, conflicts: [] } as WeekplannerItem]);
    const afterIncidents = buildPlanningConflictIncidents(weekWithItems(afterItems));
    const pitchIncidentsAfter = afterIncidents.filter(
      (incident) => incident.resourceKind === "PITCH_HALL",
    );
    expect(pitchIncidentsAfter).toHaveLength(0);

    vi.unstubAllGlobals();
  });

  it("does not report resource swap as applied when reassign fails", async () => {
    const f2 = trainingItem({
      id: "training:f2",
      sessionId: "session-f2",
      title: "Junioren F2",
      pitch: KUNSTRASEN_2_A,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Konflikt — belegt" }),
      }),
    );
    const draft: SchedulerDraftChange = {
      itemId: f2.id,
      originalStart: f2.startAt,
      originalEnd: f2.endAt,
      proposedStart: f2.startAt,
      proposedEnd: f2.endAt,
      originalResourceId: KUNSTRASEN_2_A.facilityResourceId,
      proposedResourceId: HAUPTFELD_A.facilityResourceId,
      manipulationType: "move",
      timeTarget: "resourceOccupancy",
      item: f2,
    };
    await expect(
      applyStandardPlanSchedulerDraft(
        draft,
        "pitch",
        { PITCH_HALL: [], DRESSING_ROOM: [] },
        "Europe/Zurich",
      ),
    ).rejects.toThrow(/Konflikt|Ressourcenzuweisung/);
    vi.unstubAllGlobals();
  });
});
