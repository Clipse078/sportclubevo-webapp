import { describe, expect, it } from "vitest";
import { buildPlanningConflictIncidents, countConflictsByKind } from "../conflict-attention";
import type { WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";

const PITCH = {
  facilityResourceId: "pitch-1",
  facilityId: "fac-1",
  code: "KR2_A",
  name: "KR2 A",
  facilityName: "Anlage",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

const ROOM = {
  facilityResourceId: "room-1",
  facilityId: "fac-2",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function trainingItem(id: string, start: string, end: string): WeekplannerTrainingItem {
  const startAt = new Date(start);
  const endAt = new Date(end);
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
    teamNames: ["Team A"],
    pitchAllocations: [PITCH],
    dressingRoomAllocations: [ROOM],
    canonicalPitchAllocations: [PITCH],
    canonicalDressingRoomAllocations: [ROOM],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [{ facilityResourceId: PITCH.facilityResourceId, facilityResourceName: PITCH.name }],
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

describe("buildPlanningConflictIncidents", () => {
  it("detects overlapping pitch occupancy between two trainings", () => {
    const week: WeekplannerWeek = {
      days: [
        {
          dayKey: "2026-09-16",
          items: [
            trainingItem("training:a", "2026-09-16T13:45:00.000Z", "2026-09-16T15:15:00.000Z"),
            {
              ...trainingItem("training:b", "2026-09-16T13:45:00.000Z", "2026-09-16T15:15:00.000Z"),
              conflicts: [{ facilityResourceId: PITCH.facilityResourceId, facilityResourceName: PITCH.name }],
            },
          ],
        },
        ...["2026-09-14", "2026-09-15", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"].map(
          (dayKey) => ({ dayKey, items: [] }),
        ),
      ],
      weekNumberLabel: "KW 38",
      rangeLabel: "14.–20. Sep",
      param: "2026-09-14",
      previousParam: "2026-09-07",
      nextParam: "2026-09-21",
    };

    const incidents = buildPlanningConflictIncidents(week);
    expect(incidents.length).toBeGreaterThan(0);
    expect(incidents[0]?.resourceKind).toBe("PITCH_HALL");
    const counts = countConflictsByKind(incidents);
    expect(counts.pitch).toBeGreaterThan(0);
  });
});
