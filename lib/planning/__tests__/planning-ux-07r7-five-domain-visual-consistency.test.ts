import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveFacilityResourceVisualKind } from "@/lib/planning/planning-facility-resource-visual";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R7 five-domain visual consistency", () => {
  describe("TRAINING_CREATE_NO_DUPLICATE_RESOURCE_LABELS", () => {
    it("training create hides row subject labels under numbered section headings", () => {
      const create = read("components/admin/training/TrainingSeriesCreateForm.tsx");
      expect(create).toContain("showSubjectLabel={false}");
      expect(create).toMatch(/Spielfeld \/ Halle[\s\S]*showSubjectLabel=\{false\}/);
      expect(create).toMatch(/Garderobe[\s\S]*showSubjectLabel=\{false\}/);
    });
  });

  describe("TRAINING_RESOURCE_ICON_CANONICAL", () => {
    it("training series allocation editor uses metadata-based semantic icon tile", () => {
      const editor = read("components/admin/training/TrainingAllocationEditor.tsx");
      expect(editor).toContain("PlanningResourceSemanticIconTile");
      expect(editor).not.toContain("LayoutGrid");
    });
  });

  describe("TRAINING_PUBLICATION_IN_RIGHT_RAIL", () => {
    it("training series edit renders publication in canonical right rail panel", () => {
      const workspace = read("components/admin/training/record/TrainingSeriesRecordWorkspace.tsx");
      expect(workspace).toContain("PlanningPublicationPanel");
      expect(workspace).toContain('testId="training-series-edit-publication-panel"');
      expect(workspace).not.toContain('testId="training-record-section-publication"');
    });
  });

  describe("TRAINING_PUBLICATION_TEAMSEASON_SCOPED", () => {
    it("publication rail still uses TeamSeason-scoped TrainingRecordPublicationSection", () => {
      const workspace = read("components/admin/training/record/TrainingSeriesRecordWorkspace.tsx");
      expect(workspace).toContain("TrainingRecordPublicationSection");
      expect(workspace).toContain("teamSeasonId={selectedTeamSeason.id}");
      const pubSection = read("components/admin/training/record/TrainingRecordPublicationSection.tsx");
      expect(pubSection).toContain("training-record-publication-scope-intro");
    });
  });

  describe("MATCH_RESOURCE_STRUCTURE_CANONICAL", () => {
    it("match create and operational surfaces use assignment rows without duplicate pitch labels", () => {
      const create = read("components/admin/matchcenter/MatchCreateForm.tsx");
      expect(create).toContain("PlanningMatchDressingRoomAssignments");
      expect(create).toMatch(/Spielfeld \/ Halle[\s\S]*showSubjectLabel=\{false\}/);
      const operational = read("components/admin/matchcenter/MatchcenterDetailOperational.tsx");
      expect(operational).toContain("PlanningMatchDressingRoomAssignments");
      expect(operational).toContain("showSubjectLabel={false}");
    });
  });

  describe("MATCH_HOME_AWAY_DRESSING_PRESERVED", () => {
    it("match dressing assignments retain Heim/Gast semantics", () => {
      const create = read("components/admin/matchcenter/MatchCreateForm.tsx");
      expect(create).toContain("homeLabel={tResources(\"matchHomeSide\")}");
      expect(create).toContain("awayLabel={tResources(\"matchAwaySide\")}");
    });
  });

  describe("TOURNAMENT_RESOURCE_STRUCTURE_CANONICAL", () => {
    it("tournament pitch allocation uses shared assignment without duplicate type label", () => {
      const editor = read("components/admin/tournamentcenter/TournamentResourceAllocationEditor.tsx");
      expect(editor).toContain("PlanningSingleResourceAssignment");
      expect(editor).toContain("showSubjectLabel={false}");
    });
  });

  describe("TOURNAMENT_PARTICIPANT_DRESSING_PRESERVED", () => {
    it("tournament participant dressing panel remains canonical", () => {
      const panel = read("components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel.tsx");
      expect(panel).toContain("PlanningSubjectDressingRoomAssignments");
    });
  });

  describe("VERANSTALTUNG_GRUNDDATEN_LAYOUT_CONTRACT", () => {
    it("veranstaltung create grunddaten selects use standard fca-select height (no h-8 clip)", () => {
      const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
      expect(form).toContain("veranstaltung-create-details-section");
      expect(form).not.toMatch(/fca-select h-8/);
      expect(form).toMatch(/fca-select text-sm/);
    });
  });

  describe("VERANSTALTUNG_PUBLICATION_RIGHT_RAIL", () => {
    it("veranstaltung create keeps publication in PlanningPublicationPanel rail", () => {
      const form = read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx");
      expect(form).toContain("PlanningPublicationPanel");
      expect(form).toContain("veranstaltung-create-publication-panel");
    });
  });

  describe("VERANSTALTUNG_OTHER_RESOURCE_PRESERVED", () => {
    it("veranstaltung allocation editor retains OTHER resources section", () => {
      const editor = read("components/admin/veranstaltungen/VeranstaltungFacilityAllocationEditor.tsx");
      expect(editor).toContain("TRAINING_ALLOCATION_GROUP_LABELS.OTHER");
      expect(editor).toContain("PlanningResourcePicker");
    });
  });

  describe("SHARED_ASSIGNMENT_ACTION_COPY", () => {
    it("canonical Zuweisen/Ändern via PlanningResources translations", () => {
      const row = read("components/admin/shared/planning/PlanningSingleResourceAssignment.tsx");
      expect(row).toContain('t("change")');
      expect(row).toContain('t("assign")');
    });
  });

  describe("SHARED_RESOURCE_ICON_RESOLVER", () => {
    it("resolver maps pitch and dressing types from FacilityResource metadata", () => {
      expect(resolveFacilityResourceVisualKind("FULL_PITCH")).toBe("pitch");
      expect(resolveFacilityResourceVisualKind("HALF_PITCH")).toBe("pitch");
      expect(resolveFacilityResourceVisualKind("DRESSING_ROOM")).toBe("dressing_room");
      expect(resolveFacilityResourceVisualKind("OTHER")).toBe("other");
      const shared = read("lib/planning/planning-facility-resource-visual.ts");
      expect(shared).toContain("resolveFacilityResourceVisualKind");
      expect(read("components/admin/shared/planning/FacilityResourceIdentity.tsx")).toContain(
        "PlanningResourceSemanticIconTile",
      );
    });
  });

  describe("OCCUPIED_REMAINS_SELECTABLE", () => {
    it("picker does not hard-disable occupied resources", () => {
      const picker = read("components/admin/shared/planning/PlanningResourcePicker.tsx");
      expect(picker).not.toMatch(/disabled=\{[^}]*occupancy[^}]*OCCUPIED/i);
      expect(picker).not.toContain("hard-disable");
    });
  });
});
