import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R7B final create-flow UX cleanup", () => {
  describe("TRAINING_TEAM_SEASON_SELECTOR_SPACING", () => {
    it("TeamSeasonSearchablePicker uses canonical fca-search-input + fca-combobox-input contract", () => {
      const picker = read("components/admin/shared/TeamSeasonSearchablePicker.tsx");
      expect(picker).toContain("fca-search-input");
      expect(picker).toContain("fca-combobox-input");
      expect(picker).not.toMatch(/pl-8/);
    });

    it("training create still wires TeamSeasonSearchablePicker", () => {
      const create = read("components/admin/training/TrainingSeriesCreateForm.tsx");
      expect(create).toContain("TeamSeasonSearchablePicker");
      expect(create).toContain("Team / Saison auswählen");
    });
  });

  describe("MATCH_CREATE_NO_LEGACY_LOCATION_QUICKPICKS", () => {
    it("match create Ort has no facility-name quick-choice chips", () => {
      const create = read("components/admin/matchcenter/MatchCreateForm.tsx");
      expect(create).toContain('data-testid="match-create-location"');
      expect(create).not.toContain("match-create-location-quickpick");
      expect(create).not.toContain("facilityNameQuickPicks");
    });

    it("match create step 5 Spielfeld / Halle remains canonical PlanningResourcePicker path", () => {
      const create = read("components/admin/matchcenter/MatchCreateForm.tsx");
      expect(create).toContain("PlanningSingleResourceAssignment");
      expect(create).toMatch(/Spielfeld \/ Halle[\s\S]*showSubjectLabel=\{false\}/);
      expect(create).toContain("PlanningMatchDressingRoomAssignments");
    });
  });

  describe("NO_STATIC_FCA_RESOURCE_ALLOWLIST", () => {
    it("match create does not hard-code tenant pitch names", () => {
      const create = read("components/admin/matchcenter/MatchCreateForm.tsx");
      for (const label of ["Hauptfeld", "Hauptplatz", "Kunstrasen 2", "Kunstrasen 3"]) {
        expect(create).not.toContain(label);
      }
    });
  });
});
