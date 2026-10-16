/**
 * SCE-ACTIVITY-CREATE-01J-R5.5 — Wochenplaner default Liste, view order, canonical cards, operational status.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLANNING_HUB_PERSPECTIVE_ORDER,
  buildPlanningHubHref,
  parsePlanningHubUrlState,
} from "../planner-url";
import {
  derivePlannerOperationalStatus,
  plannerOperationalIssueSummaryLabel,
} from "../planner-operational-status";
import type { WeekplannerTrainingItem } from "@/lib/weekplanner/types";

const ROOT = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function training(overrides: Partial<WeekplannerTrainingItem> = {}): WeekplannerTrainingItem {
  return {
    id: "training:1",
    tenantId: "t1",
    type: "TRAINING",
    startAt: new Date("2026-10-05T15:00:00.000Z"),
    endAt: new Date("2026-10-05T16:30:00.000Z"),
    canonicalStartAt: new Date("2026-10-05T15:00:00.000Z"),
    canonicalEndAt: new Date("2026-10-05T16:30:00.000Z"),
    timeOverridden: false,
    title: "Training",
    teamNames: ["Team A"],
    pitchAllocations: [],
    dressingRoomAllocations: [],
    canonicalPitchAllocations: [],
    canonicalDressingRoomAllocations: [],
    pitchOverridden: false,
    dressingRoomOverridden: false,
    conflicts: [],
    dressingRoomOccupancyMode: "DEFAULT",
    dressingRoomOccupancyBeforeMinutes: null,
    dressingRoomOccupancyAfterMinutes: null,
    dressingRoomResolvedBeforeMinutes: 0,
    dressingRoomResolvedAfterMinutes: 0,
    trainingSeriesId: "s1",
    trainingSessionId: "training:1",
    teamSeasonId: "ts1",
    ...overrides,
  };
}

describe("SCE-ACTIVITY-CREATE-01J-R5.5 Wochenplaner", () => {
  it("defaults /dashboard/planner/week to Liste without ansicht param", () => {
    const state = parsePlanningHubUrlState({});
    expect(state.perspective).toBe("liste");
    expect(buildPlanningHubHref(state)).toBe("/dashboard/planner/week");
  });

  it("exposes canonical perspective order Liste → Spielfeld → Garderobe → Kalender", () => {
    expect([...PLANNING_HUB_PERSPECTIVE_ORDER]).toEqual([
      "liste",
      "spielfeld",
      "garderobe",
      "kalender",
    ]);
    const chrome = read("components/admin/planner/WeekPlannerChrome.tsx");
    const idxListe = chrome.indexOf('["liste", "Liste"]');
    const idxKalender = chrome.indexOf('["kalender", "Kalender"]');
    expect(idxListe).toBeGreaterThan(-1);
    expect(idxKalender).toBeGreaterThan(idxListe);
  });

  it("round-trips explicit ansicht values", () => {
    for (const perspective of ["liste", "spielfeld", "garderobe", "kalender"] as const) {
      const state = parsePlanningHubUrlState({ ansicht: perspective, week: "2026-10-05" });
      expect(state.perspective).toBe(perspective);
      const href = buildPlanningHubHref(state);
      if (perspective === "liste") {
        expect(href).not.toContain("ansicht=");
      } else {
        expect(href).toContain(`ansicht=${perspective}`);
      }
    }
  });

  it("uses canonical Sce* cards via PlanningHubListeSceActivityCard — no parallel family", () => {
    const wrapper = read("components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx");
    expect(wrapper).toContain("SceTrainingCard");
    expect(wrapper).toContain("SceMatchCard");
    expect(wrapper).toContain("SceTournamentCard");
    expect(wrapper).toContain("SceClubEventCard");
    for (const forbidden of [
      "PlanningTrainingCard",
      "PlanningMatchCard",
      "WochenplanActivityCard",
    ]) {
      expect(wrapper).not.toContain(forbidden);
    }
  });

  it("derives operational issue summaries for healthy, conflict, incomplete, and combined states", () => {
    const pitch = {
      facilityResourceId: "p1",
      facilityId: "f1",
      code: "KR2",
      name: "Kunstrasen 2",
      facilityName: "Anlage",
      resourceType: "HALF_PITCH" as const,
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    };
    const room = {
      facilityResourceId: "d1",
      facilityId: "f1",
      code: "E1",
      name: "Garderobe E1",
      facilityName: "Anlage",
      resourceType: "DRESSING_ROOM" as const,
      occupancyBeforeMinutes: 0,
      occupancyAfterMinutes: 0,
    };
    const healthy = derivePlannerOperationalStatus(
      training({ pitchAllocations: [pitch], dressingRoomAllocations: [room] }),
    );
    expect(plannerOperationalIssueSummaryLabel(healthy)).toBeNull();

    const incomplete = derivePlannerOperationalStatus(training());
    expect(plannerOperationalIssueSummaryLabel(incomplete)).toMatch(/Unvollständig/);

    const conflict = derivePlannerOperationalStatus(
      training({
        pitchAllocations: [
          {
            facilityResourceId: "p1",
            facilityId: "f1",
            code: "KR2",
            name: "Kunstrasen 2",
            facilityName: "Anlage",
            resourceType: "HALF_PITCH",
            occupancyBeforeMinutes: 0,
            occupancyAfterMinutes: 0,
          },
        ],
        conflicts: [
          {
            facilityResourceId: "p1",
            facilityResourceName: "Kunstrasen 2",
            resourceKind: "PITCH_HALL",
            partnerTitle: "Junioren E1",
          },
        ],
      }),
    );
    expect(plannerOperationalIssueSummaryLabel(conflict)).toMatch(/Konflikt/);

    const both = derivePlannerOperationalStatus(
      training({
        conflicts: [
          {
            facilityResourceId: "p1",
            facilityResourceName: "Kunstrasen 2",
            partnerTitle: "Junioren E1",
          },
          {
            facilityResourceId: "p2",
            facilityResourceName: "Garderobe E3",
            resourceKind: "DRESSING_ROOM",
            partnerTitle: "Match",
          },
        ],
      }),
    );
    expect(plannerOperationalIssueSummaryLabel(both)).toMatch(/2 Konflikte · Unvollständig/);
  });

  it("wires operational status into hover detail and opened editor sheet", () => {
    expect(read("components/admin/planning-hub/PlanningHubActivityDetailSurface.tsx")).toContain(
      "PlannerOperationalStatusSection",
    );
    expect(read("components/admin/planner/WeekplannerPlanningSheet.tsx")).toContain(
      "weekplanner-editor-planungsstatus",
    );
  });
});
