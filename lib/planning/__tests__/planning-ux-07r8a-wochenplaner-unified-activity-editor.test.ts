import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R8A unified Wochenplaner activity editor", () => {
  describe("A — shared editor family", () => {
    it("canonical sheet composes shared shell primitives for all activity types", () => {
      const sheet = read("components/admin/planner/WeekplannerPlanningSheet.tsx");
      expect(sheet).toContain("WeekplannerActivityEditorShell");
      expect(sheet).toContain("WeekplannerActivityIdentityCard");
      expect(sheet).toContain("WeekplannerDateTimeFields");
      expect(sheet).toContain("VeranstaltungEditorContent");
      expect(sheet).toContain('item.type === "VERANSTALTUNG"');
    });

    it("operational sheet keeps plan override mutations", () => {
      const operational = read("components/admin/planner/WeekplannerOperationalPlanningSheet.tsx");
      expect(operational).toContain("replaceAllocationOverrides");
      expect(operational).toContain("saveTimeOverride");
    });
  });

  describe("B — date/time persistence paths", () => {
    it("documents canonical write targets", () => {
      const matrix = read("docs/planning-ux-07r8a-wochenplaner-mutation-matrix.md");
      expect(matrix).toContain("training-sessions");
      expect(matrix).toContain("operational-end");
      expect(matrix).toContain("/api/tournaments/");
    });

    it("match schedule helper respects SFV vs manual paths", () => {
      const schedule = read("lib/weekplanner/weekplanner-match-schedule.ts");
      expect(schedule).toContain("isMatchScheduleExternallyOwned");
      expect(schedule).toContain("saveMatchOperationalEndOverride");
      expect(schedule).toContain("saveManualMatchSchedule");
    });
  });

  describe("C — resources", () => {
    it("tournament editor uses participant dressing panel", () => {
      expect(read("components/admin/planner/WeekplannerPlanningSheet.tsx")).toContain(
        "WeekplannerTournamentParticipantDressingSection",
      );
      expect(read("components/admin/planner/WeekplannerTournamentParticipantDressingSection.tsx")).toContain(
        "TournamentParticipantDressingRoomPanel",
      );
    });

    it("veranstaltung editor uses canonical facility allocation editor", () => {
      expect(read("components/admin/planner/WeekplannerPlanningSheet.tsx")).toContain(
        "VeranstaltungFacilityAllocationEditor",
      );
    });
  });

  describe("D — match identity", () => {
    it("queries resolve club crests via canonical club identity helper", () => {
      const queries = read("lib/weekplanner/queries.ts");
      expect(queries).toContain("resolveClubIdentityLogoUrl");
      expect(queries).toContain("homeSide");
      expect(queries).toContain("awaySide");
    });

    it("match identity card uses bare ClubLogo", () => {
      const card = read("components/admin/planner/WeekplannerMatchIdentityCard.tsx");
      expect(card).toContain("ClubLogo");
      expect(card).toContain("bare");
      expect(card).toContain("weekplanner-match-home-crest");
      expect(card).toContain("weekplanner-match-away-crest");
    });
  });

  describe("E — overlay", () => {
    it("sheet uses SceModalOverlay and globals define blur scrim", () => {
      expect(read("components/ui/Sheet.tsx")).toContain("SceModalOverlay");
      const css = read("app/globals.css");
      expect(css).toContain("--sce-modal-backdrop: rgb(2 6 15 / 42%);");
      expect(css).toMatch(/\.sce-modal-overlay-backdrop[\s\S]*backdrop-filter:\s*blur\(10px\)/);
    });
  });

  describe("F — plan semantics", () => {
    it("veranstaltungen remain excluded from alternative-plan activity type mapping", () => {
      expect(read("lib/weekplanner/plan-types.ts")).toContain("not Veranstaltungen");
    });
  });
});
