import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import {
  formatResourceOccupancyPrimaryLine,
  mergeMatchDressingRoomSideAvailability,
  mergeTournamentParticipantDressingRoomAvailability,
} from "@/lib/planning/resource-occupancy-presentation";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R4 unified resource assignment UX", () => {
  describe("shared architecture", () => {
    it("defines canonical assignment list, row, and picker components", () => {
      expect(read("components/admin/shared/planning/PlanningResourceAssignment.tsx")).toContain(
        "PlanningResourceAssignment",
      );
      expect(read("components/admin/shared/planning/PlanningResourceAssignmentList.tsx")).toContain(
        "PlanningResourceAssignmentList",
      );
      expect(read("components/admin/shared/planning/PlanningResourcePicker.tsx")).toContain("PlanningResourcePicker");
      expect(read("components/admin/shared/planning/PlanningResourcePicker.tsx")).toContain('layout="default"');
    });

    it("tournament dressing panel uses assignment rows instead of per-team aggregated inventories", () => {
      const panel = read("components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel.tsx");
      expect(panel).toContain("PlanningSubjectDressingRoomAssignments");
      expect(panel).not.toContain("CompactDressingRoomResourceSelector");
      expect(panel).not.toContain('layout="aggregated"');
    });

    it("match operational surfaces use shared match dressing assignment component", () => {
      const match = read("components/admin/matchcenter/MatchcenterDetailOperational.tsx");
      expect(match).toContain("PlanningMatchDressingRoomAssignments");
      expect(match).not.toContain("CompactDressingRoomResourceSelector");
    });
  });

  describe("tournament dressing rooms", () => {
    it("does not render duplicate Verfügbar sections per participant in the panel", () => {
      const panel = read("components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel.tsx");
      expect(panel).not.toContain("Verfügbar");
      const subjectAssignments = read("components/admin/shared/planning/PlanningSubjectDressingRoomAssignments.tsx");
      expect(subjectAssignments).not.toContain('layout="aggregated"');
    });

    it("picker path uses occupancy resolver for another team's room", () => {
      const participants = [
        { id: "a", displayName: "FC Allschwil Junioren F2", dressingRoomAllocations: [{ facilityResourceId: "e1" }] },
        { id: "b", displayName: "US Olympia 1963", dressingRoomAllocations: [] },
      ];
      const forB = mergeTournamentParticipantDressingRoomAvailability(new Map(), participants, "b");
      expect(formatResourceOccupancyPrimaryLine(forB.get("e1"))).toContain("FC Allschwil");
    });

    it("Saisonplaner and TournamentCenter share the dressing-room panel component", () => {
      const planner = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");
      const center = read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx");
      expect(planner).toContain("TournamentParticipantDressingRoomPanel");
      expect(center).toContain("TournamentParticipantDressingRoomPanel");
    });
  });

  describe("match Heim/Gast", () => {
    it("mergeMatchDressingRoomSideAvailability exposes other side in picker", () => {
      const base = new Map<string, ResourceAvailabilityAnnotation>();
      const forAway = mergeMatchDressingRoomSideAvailability(base, {
        homeCode: "E1",
        awayCode: "E2",
        homeLabel: "FC Allschwil D7",
        awayLabel: "FC Amicitia Riehen D7a",
        editingSide: "away",
      });
      expect(formatResourceOccupancyPrimaryLine(forAway.get("E1"))).toContain("FC Allschwil");
      expect(formatResourceOccupancyPrimaryLine(forAway.get("E2"), { isSelected: true })).toContain("FC Amicitia");
    });

    it("create form uses assignment rows for dressing rooms", () => {
      const createForm = read("components/admin/matchcenter/MatchCreateForm.tsx");
      expect(createForm).toContain("PlanningMatchDressingRoomAssignments");
      expect(createForm).not.toContain("CompactDressingRoomResourceSelector");
    });
  });

  describe("training create/edit parity", () => {
    it("training create uses compact single-resource assignment rows", () => {
      const create = read("components/admin/training/TrainingSeriesCreateForm.tsx");
      expect(create).toContain("PlanningSingleResourceAssignment");
      expect(create).not.toContain('layout="aggregated"');
    });

    it("training session edit picker uses PlanningResourcePicker", () => {
      const edit = read("components/admin/training/TrainingSessionAllocationEditor.tsx");
      expect(edit).toContain("PlanningResourcePicker");
      expect(edit).toContain("useFacilityAvailability");
    });

    it("training series allocation editor uses PlanningResourcePicker (not legacy FacilityResourceSelector)", () => {
      const seriesEditor = read("components/admin/training/TrainingAllocationEditor.tsx");
      expect(seriesEditor).toContain("PlanningResourcePicker");
      expect(seriesEditor).not.toMatch(/import\s*\{\s*FacilityResourceSelector/);
      expect(seriesEditor).not.toContain("<FacilityResourceSelector");
    });
  });

  describe("documentation", () => {
    it("documents PLANNING-UX-07R4 contract", () => {
      const doc = read("docs/planning/PLANNING-UX-07R4-UNIFIED-RESOURCE-ASSIGNMENT-UX.md");
      expect(doc).toContain("assignment");
      expect(doc).toContain("availability");
      expect(doc).toContain("UX-07R3");
    });
  });
});
