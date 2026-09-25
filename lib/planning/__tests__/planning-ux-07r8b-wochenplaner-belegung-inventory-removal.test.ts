import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R8B Wochenplaner legacy Belegung inventory removal", () => {
  describe("A — Tournament Wochenplaner editor", () => {
    it("keeps participant dressing rows and picker path without permanent global inventory", () => {
      const section = read("components/admin/planner/WeekplannerTournamentParticipantDressingSection.tsx");
      expect(section).toContain("TournamentParticipantDressingRoomPanel");
      expect(section).toContain("Garderoben");

      const panel = read("components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel.tsx");
      expect(panel).toContain("PlanningSubjectDressingRoomAssignments");
      expect(panel).not.toContain("showGlobalOverview");
      expect(panel).not.toContain("PlanningResourceGlobalOccupancyOverview");
    });

    it("subject assignments expose PlanningResourcePicker on demand only", () => {
      const assignments = read("components/admin/shared/planning/PlanningSubjectDressingRoomAssignments.tsx");
      expect(assignments).toContain("PlanningResourcePicker");
      expect(assignments).toContain("PlanningResourceAssignment");
      expect(assignments).not.toContain("PlanningResourceGlobalOccupancyOverview");
      expect(assignments).not.toContain("showGlobalOverview");
      expect(assignments).not.toContain("globalOccupancyHeading");
    });
  });

  describe("B — Training", () => {
    it("keeps pitch/dressing sections and occupancy-duration editor", () => {
      const sheet = read("components/admin/planner/WeekplannerPlanningSheet.tsx");
      expect(sheet).toContain("WeekplannerPlanningResourceSection");
      expect(sheet).toContain("DressingRoomOccupancyEditor");
      expect(sheet).not.toContain("PlanningResourceGlobalOccupancyOverview");
      expect(sheet).not.toContain("showGlobalOverview");
    });
  });

  describe("C — Match", () => {
    it("keeps Heim/Gast dressing and occupancy-duration without global inventory", () => {
      const sheet = read("components/admin/planner/WeekplannerPlanningSheet.tsx");
      expect(sheet).toContain("DressingRoomOccupancyEditor");
      expect(sheet).toContain("WeekplannerPlanningResourceSection");
      expect(sheet).not.toContain("PlanningResourceGlobalOccupancyOverview");
    });

    it("match dressing assignments do not mount global occupancy overview", () => {
      const matchDressing = read("components/admin/shared/planning/PlanningMatchDressingRoomAssignments.tsx");
      expect(matchDressing).toContain("PlanningSubjectDressingRoomAssignments");
      expect(matchDressing).not.toContain("showGlobalOverview");
    });
  });

  describe("D — Veranstaltung", () => {
    it("uses canonical facility allocation editor without parallel inventory", () => {
      const sheet = read("components/admin/planner/WeekplannerPlanningSheet.tsx");
      expect(sheet).toContain("VeranstaltungFacilityAllocationEditor");
      expect(sheet).not.toContain("PlanningResourceGlobalOccupancyOverview");
    });
  });

  describe("E — Canonical engine", () => {
    it("availability interaction remains in PlanningResourcePicker", () => {
      const picker = read("components/admin/shared/planning/PlanningResourcePicker.tsx");
      expect(picker).toContain("CompactOperationalResourceSelector");
      const selector = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(selector).toContain("formatResourceOccupancyPrimaryLine");
      expect(selector).toContain("resolveResourceOccupancyPresentationKind");
    });
  });

  describe("F — Alternative plan / operational sheet", () => {
    it("operational overrides use WeekplannerPlanningResourceSection without global inventory", () => {
      const operational = read("components/admin/planner/WeekplannerOperationalPlanningSheet.tsx");
      expect(operational).toContain("WeekplannerPlanningResourceSection");
      expect(operational).not.toContain("PlanningResourceGlobalOccupancyOverview");
      expect(operational).not.toContain("showGlobalOverview");
    });
  });

  describe("G — R8/R8A modal shell preserved", () => {
    it("activity editor shell and overlay contract unchanged", () => {
      expect(read("components/admin/planner/WeekplannerActivityEditorShell.tsx")).toContain(
        "WeekplannerActivityEditorShell",
      );
      expect(read("components/ui/Sheet.tsx")).toContain("SceModalOverlay");
    });
  });
});
