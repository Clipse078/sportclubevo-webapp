import { describe, expect, it } from "vitest";
import { buildPlanningConflictIncidents } from "../conflict-attention";
import {
  canonicalConflictIncidentTotal,
  filterConflictIncidents,
} from "../conflict-resolution";
import { reconcileSelectedConflictIncidentId } from "../conflict-resolution-workspace";
import {
  buildConflictResolutionFilterOptions,
  conflictIncidentListPrimaryLabel,
  conflictIncidentSearchHaystack,
} from "../conflict-workspace-presenters";
import type { PlanningConflictIncident } from "../conflict-attention";
import type { WeekplannerTrainingItem, WeekplannerWeek } from "@/lib/weekplanner/types";
import { annotateWeekplannerConflicts } from "@/lib/weekplanner/conflict-detection";

const PITCH_B = {
  facilityResourceId: "pitch-k2b",
  facilityId: "fac-kr2",
  code: "KR2_B",
  name: "Kunstrasen 2 B",
  facilityName: "Kunstrasen 2",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const PITCH_OTHER = {
  facilityResourceId: "pitch-k2b-other",
  facilityId: "fac-kr2",
  code: "KR2_B",
  name: "Kunstrasen 2 B",
  facilityName: "Kunstrasen 2",
  resourceType: "HALF_PITCH" as const,
  occupancyBeforeMinutes: 15,
  occupancyAfterMinutes: 0,
};

const ROOM_E1 = {
  facilityResourceId: "room-e1",
  facilityId: "f-dress",
  code: "E1",
  name: "E1",
  facilityName: "Garderobe",
  resourceType: "DRESSING_ROOM" as const,
  occupancyBeforeMinutes: 0,
  occupancyAfterMinutes: 0,
};

function training(
  id: string,
  team: string,
  pitch = PITCH_B,
  room = ROOM_E1,
  startAt = new Date("2026-09-28T15:00:00.000Z"),
  endAt = new Date("2026-09-28T16:30:00.000Z"),
): WeekplannerTrainingItem {
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
    teamNames: [team],
    pitchAllocations: [pitch],
    dressingRoomAllocations: [room],
    canonicalPitchAllocations: [pitch],
    canonicalDressingRoomAllocations: [room],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    trainingSeriesId: "s1",
    trainingSessionId: id,
    teamSeasonId: "ts1",
  };
}

function weekWith(items: WeekplannerTrainingItem[]): WeekplannerWeek {
  return {
    weekKey: "2026-W39",
    days: [{ dayKey: "2026-09-28", items: annotateWeekplannerConflicts(items) }],
  };
}

describe("SCE-PLANNER-UX-08-05R7 conflict workspace presentation", () => {
  const itemA = training("training:a", "Junioren F2", PITCH_B, ROOM_E1);
  const itemB = training("training:b", "Junioren F3", PITCH_OTHER, ROOM_E1);
  const itemC = training(
    "training:c",
    "Junioren E2",
    {
      ...PITCH_B,
      facilityResourceId: "pitch-k3b",
      name: "Kunstrasen 3 B",
      facilityName: "Kunstrasen 3",
    },
    {
      ...ROOM_E1,
      facilityResourceId: "room-e2",
      name: "E2",
      code: "E2",
    },
  );
  const itemD = training("training:d", "Junioren E3", PITCH_B, ROOM_E1, itemC.startAt, itemC.endAt);

  const week = weekWith([itemA, itemB, itemC, itemD]);
  const incidents = buildPlanningConflictIncidents(week);
  const itemsById = new Map(week.days[0]!.items.map((item) => [item.id, item]));

  it("A — dressing incident E1 renders Garderobe E1", () => {
    const dressing = incidents.find((i) => i.resourceKind === "DRESSING_ROOM" && i.facilityResourceId === "room-e1");
    expect(dressing).toBeTruthy();
    expect(conflictIncidentListPrimaryLabel(dressing!, itemsById)).toBe("Garderobe E1");
  });

  it("B — pitch incident renders Spielfeld Kunstrasen 2 · B", () => {
    const pitch = incidents.find(
      (i) => i.resourceKind === "PITCH_HALL" && i.facilityResourceId === "pitch-k2b",
    );
    expect(pitch).toBeTruthy();
    expect(conflictIncidentListPrimaryLabel(pitch!, itemsById)).toBe("Spielfeld Kunstrasen 2 · B");
  });

  it("C — mixed incident list remains correctly ordered by overlap start", () => {
    const filtered = filterConflictIncidents(incidents, { query: "", kind: "all", itemsById });
    for (let i = 1; i < filtered.length; i += 1) {
      expect(filtered[i]!.startAt.getTime()).toBeGreaterThanOrEqual(filtered[i - 1]!.startAt.getTime());
    }
  });

  it("D — Alle Konflikte includes both kinds", () => {
    const filtered = filterConflictIncidents(incidents, { query: "", kind: "all", itemsById });
    expect(filtered.some((i) => i.resourceKind === "PITCH_HALL")).toBe(true);
    expect(filtered.some((i) => i.resourceKind === "DRESSING_ROOM")).toBe(true);
  });

  it("E — Spielfelder filters to pitch conflicts", () => {
    const filtered = filterConflictIncidents(incidents, { query: "", kind: "PITCH_HALL", itemsById });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((i) => i.resourceKind === "PITCH_HALL")).toBe(true);
  });

  it("F — Garderoben filters to dressing conflicts", () => {
    const filtered = filterConflictIncidents(incidents, { query: "", kind: "DRESSING_ROOM", itemsById });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((i) => i.resourceKind === "DRESSING_ROOM")).toBe(true);
  });

  it("G — search Garderobe matches dressing incidents", () => {
    const filtered = filterConflictIncidents(incidents, { query: "Garderobe", kind: "all", itemsById });
    expect(filtered.every((i) => i.resourceKind === "DRESSING_ROOM")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("H — search E1 matches E1 dressing incident", () => {
    const filtered = filterConflictIncidents(incidents, { query: "E1", kind: "all", itemsById });
    expect(filtered.some((i) => i.facilityResourceId === "room-e1")).toBe(true);
  });

  it("I — search Kunstrasen matches pitch incidents", () => {
    const filtered = filterConflictIncidents(incidents, { query: "Kunstrasen", kind: "all", itemsById });
    expect(filtered.every((i) => i.resourceKind === "PITCH_HALL")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("J — search activity/team label still works", () => {
    const filtered = filterConflictIncidents(incidents, { query: "Junioren F2", kind: "all", itemsById });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.some((i) => i.itemIds.includes("training:a"))).toBe(true);
  });

  it("K — filter/search combination works", () => {
    const filtered = filterConflictIncidents(incidents, {
      query: "Junioren F2",
      kind: "PITCH_HALL",
      itemsById,
    });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((i) => i.resourceKind === "PITCH_HALL")).toBe(true);
    expect(filtered.every((i) => i.itemIds.includes("training:a"))).toBe(true);
  });

  it("L — conflict count semantics unchanged", () => {
    expect(canonicalConflictIncidentTotal(incidents)).toBe(incidents.length);
    const options = buildConflictResolutionFilterOptions(incidents);
    expect(options[0]?.label).toMatch(/^Alle Konflikte \(\d+\)$/);
    expect(options[0]?.label).toContain(String(incidents.length));
  });

  it("M — selected incident reconciliation unchanged", () => {
    const filtered = filterConflictIncidents(incidents, { query: "E2", kind: "all", itemsById });
    const selectedId = filtered[0]?.id ?? null;
    const reconciled = reconcileSelectedConflictIncidentId(selectedId, incidents, filtered);
    expect(reconciled).toBe(selectedId);
    const missing = reconcileSelectedConflictIncidentId("gone", incidents, filtered);
    expect(missing).toBe(filtered[0]?.id ?? null);
  });

  it("R8 — stale resource ref falls back to incident facilityResourceName", () => {
    const orphanIncident: PlanningConflictIncident = {
      id: "orphan-pitch",
      facilityResourceId: "deleted-pitch-id",
      facilityResourceName: "Legacy Hauptplatz",
      resourceKind: "PITCH_HALL",
      dayKey: "2026-09-28",
      startAt: new Date("2026-09-28T15:00:00.000Z"),
      endAt: new Date("2026-09-28T16:30:00.000Z"),
      occupancyCount: 2,
      itemIds: ["training:a"],
    };
    expect(conflictIncidentListPrimaryLabel(orphanIncident, itemsById)).toBe(
      "Spielfeld Legacy Hauptplatz",
    );
    expect(() =>
      conflictIncidentSearchHaystack(orphanIncident, itemsById),
    ).not.toThrow();
  });

  it("R8 — HALF_PITCH without facilityName still formats safely", () => {
    const halfNoFacility = {
      ...PITCH_B,
      facilityName: "",
      name: "Kunstrasen 2 B",
    };
    const item = training("training:half", "Team X", halfNoFacility, ROOM_E1);
    const map = new Map([[item.id, item]]);
    const incident: PlanningConflictIncident = {
      id: "half",
      facilityResourceId: halfNoFacility.facilityResourceId,
      facilityResourceName: "Kunstrasen 2 B",
      resourceKind: "PITCH_HALL",
      dayKey: "2026-09-28",
      startAt: item.startAt,
      endAt: item.endAt,
      occupancyCount: 1,
      itemIds: [item.id],
    };
    expect(conflictIncidentListPrimaryLabel(incident, map)).toBe("Spielfeld Kunstrasen 2 · B");
  });

  it("N/O — search haystack includes canonical primary label", () => {
    const incident: PlanningConflictIncident = {
      id: "room-e1|1|2",
      facilityResourceId: "room-e1",
      facilityResourceName: "E1",
      resourceKind: "DRESSING_ROOM",
      dayKey: "2026-09-28",
      startAt: new Date("2026-09-28T15:00:00.000Z"),
      endAt: new Date("2026-09-28T16:30:00.000Z"),
      occupancyCount: 2,
      itemIds: ["training:a", "training:b"],
    };
    const haystack = conflictIncidentSearchHaystack(incident, itemsById);
    expect(haystack).toContain("garderobe e1");
  });
});
