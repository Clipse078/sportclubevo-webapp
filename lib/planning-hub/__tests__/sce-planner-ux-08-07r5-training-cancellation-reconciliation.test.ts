import { describe, expect, it } from "vitest";
import { computeAggregateInspectionMetrics } from "@/lib/planning-hub/aggregate-inspection";
import { summarizeAggregateCluster } from "@/lib/planning-hub/scheduler/aggregate-cluster";
import { buildPlanningConflictIncidents } from "@/lib/planning-hub/conflict-attention";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";
import type { WeekplannerMatchItem, WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import {
  applyTrainingCancellationToPlannerWeek,
  reconcileConflictWorkspaceActivityId,
  removeCancelledTrainingSessionFromItems,
} from "../training-cancellation-reconciliation";

const PITCH = {
  facilityResourceId: "p1",
  facilityId: "f1",
  code: "KR2A",
  name: "Kunstrasen 2 A",
  facilityName: "Anlage",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const DRESSING = {
  facilityResourceId: "d1",
  facilityId: "f1",
  code: "O3",
  name: "O3",
  facilityName: "G",
  resourceType: "DRESSING_ROOM" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  const start = new Date("2026-10-07T18:15:00.000Z");
  const end = new Date("2026-10-07T19:45:00.000Z");
  return {
    id: "training:30",
    tenantId: "t1",
    type: "TRAINING",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Senioren 30+",
    teamNames: ["Senioren 30+"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [DRESSING],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [DRESSING],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "series-30",
    trainingSessionId: "sess-30",
    teamSeasonId: "ts-30",
    ...overrides,
  };
}

function homeMatch(): WeekplannerMatchItem {
  const start = new Date("2026-10-07T18:15:00.000Z");
  const end = new Date("2026-10-07T20:15:00.000Z");
  return {
    id: "match:30",
    tenantId: "t1",
    type: "MATCH",
    startAt: start,
    endAt: end,
    canonicalStartAt: start,
    canonicalEndAt: end,
    timeOverridden: false,
    title: "Senioren 30+ vs FC Dardania",
    teamNames: ["Senioren 30+"],
    teamSeasonId: "ts-30",
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [DRESSING],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [DRESSING],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    eventId: "ev-30",
    eventSource: "SFV",
    opponentName: "FC Dardania",
    homeAway: "HOME",
    homeSide: { displayName: "Senioren 30+", logoUrl: null, isOwnTeam: true },
    awaySide: { displayName: "FC Dardania", logoUrl: null, isOwnTeam: false },
    awayDressingRoomAllocations: [],
  };
}

function weekWith(dayItems: WeekplannerTrainingItem[] | WeekplannerMatchItem[]): WeekplannerWeek {
  const annotated = annotateWeekplannerConflicts(dayItems);
  return {
    days: [
      { dayKey: "2026-10-06", items: [] },
      { dayKey: "2026-10-07", items: annotated },
      { dayKey: "2026-10-08", items: [] },
      { dayKey: "2026-10-09", items: [] },
      { dayKey: "2026-10-10", items: [] },
      { dayKey: "2026-10-11", items: [] },
      { dayKey: "2026-10-12", items: [] },
    ],
    weekNumberLabel: "KW 41",
    rangeLabel: "6.–12. Okt 2026",
    param: "2026-10-06",
    previousParam: "2026-09-29",
    nextParam: "2026-10-13",
  };
}

describe("SCE-PLANNER-UX-08-07R5 training cancellation reconciliation", () => {
  it("A–E removes cancelled training and recomputes aggregate metrics and conflicts", () => {
    const beforeWeek = weekWith([training(), homeMatch()]);
    const dayBefore = beforeWeek.days[1]!.items;
    const metricsBefore = computeAggregateInspectionMetrics(dayBefore);
    expect(metricsBefore.activityCount).toBe(2);
    expect(metricsBefore.trainingCount).toBe(1);
    expect(metricsBefore.conflictActivityCount).toBeGreaterThan(0);

    const afterWeek = applyTrainingCancellationToPlannerWeek(beforeWeek, "sess-30");
    const dayAfter = afterWeek.days[1]!.items;
    expect(dayAfter.some((item) => item.id === "training:30")).toBe(false);
    expect(dayAfter.some((item) => item.type === "MATCH")).toBe(true);

    const metricsAfter = computeAggregateInspectionMetrics(dayAfter);
    expect(metricsAfter.activityCount).toBe(1);
    expect(metricsAfter.trainingCount).toBe(0);
    expect(metricsAfter.conflictActivityCount).toBe(0);

    const incidentsBefore = buildPlanningConflictIncidents(beforeWeek).length;
    const incidentsAfter = buildPlanningConflictIncidents(afterWeek).length;
    expect(incidentsBefore).toBeGreaterThan(incidentsAfter);
    expect(incidentsAfter).toBe(0);
  });

  it("F–G recomputes facility and dressing-room aggregate metadata", () => {
    const other = training({
      id: "training:40",
      trainingSessionId: "sess-40",
      teamSeasonId: "ts-40",
      title: "Senioren 40+",
      teamNames: ["Senioren 40+"],
      dressingRoomAllocations: [
        {
          ...DRESSING,
          facilityResourceId: "d2",
          code: "O4",
          name: "O4",
        },
      ],
    });
    const beforeWeek = weekWith([training(), other]);
    const beforeMetrics = computeAggregateInspectionMetrics(beforeWeek.days[1]!.items);
    expect(beforeMetrics.uniqueFacilityCount).toBe(1);
    expect(beforeMetrics.uniqueDressingRoomCount).toBe(2);

    const afterWeek = applyTrainingCancellationToPlannerWeek(beforeWeek, "sess-30");
    const afterMetrics = computeAggregateInspectionMetrics(afterWeek.days[1]!.items);
    expect(afterMetrics.uniqueDressingRoomCount).toBe(1);
  });

  it("H preserves another selected activity when cancelled training is removed", () => {
    const beforeWeek = weekWith([training(), homeMatch()]);
    const itemsById = new Map(beforeWeek.days[1]!.items.map((item) => [item.id, item]));
    const incidents = buildPlanningConflictIncidents(beforeWeek);
    const incident = incidents[0]!;
    const nextId = reconcileConflictWorkspaceActivityId("match:30", incident, itemsById);
    expect(nextId).toBe("match:30");
  });

  it("I clears aggregate when cancellation removes the final activity", () => {
    const soloWeek = weekWith([training()]);
    const after = applyTrainingCancellationToPlannerWeek(soloWeek, "sess-30");
    expect(after.days[1]!.items).toHaveLength(0);
  });

  it("J updates calendar cluster summary from refreshed collection", () => {
    const beforeWeek = weekWith([training(), homeMatch()]);
    const beforeSummary = summarizeAggregateCluster(beforeWeek.days[1]!.items, "18:15–20:15");
    const afterWeek = applyTrainingCancellationToPlannerWeek(beforeWeek, "sess-30");
    const afterSummary = summarizeAggregateCluster(afterWeek.days[1]!.items, "18:15–20:15");
    expect(beforeSummary.activityCount).toBe(2);
    expect(afterSummary.activityCount).toBe(1);
    expect(afterSummary.headline).toBe("1 Spiel");
  });

  it("L mixed aggregate keeps match and removes only training", () => {
    const afterWeek = applyTrainingCancellationToPlannerWeek(weekWith([training(), homeMatch()]), "sess-30");
    const items = afterWeek.days[1]!.items;
    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("MATCH");
  });

  it("M+N other trainings remain cancellable targets", () => {
    const other = training({
      id: "training:40",
      trainingSessionId: "sess-40",
      title: "Senioren 40+",
      teamNames: ["Senioren 40+"],
    });
    const afterWeek = applyTrainingCancellationToPlannerWeek(weekWith([training(), other]), "sess-30");
    const remaining = afterWeek.days[1]!.items.filter((item) => item.type === "TRAINING");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.trainingSessionId).toBe("sess-40");
  });

  it("removeCancelledTrainingSessionFromItems is idempotent for unknown session", () => {
    const items = annotateWeekplannerConflicts([training(), homeMatch()]);
    const filtered = removeCancelledTrainingSessionFromItems(items, "missing");
    expect(filtered).toHaveLength(items.length);
  });
});
