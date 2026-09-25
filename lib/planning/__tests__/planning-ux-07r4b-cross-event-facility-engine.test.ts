import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mergeTournamentParticipantDressingRoomAvailability,
  formatResourceOccupancyPrimaryLine,
} from "@/lib/planning/resource-occupancy-presentation";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R4B cross-event facility engine", () => {
  describe("canonical stack wiring", () => {
    it("PlanningResourcePicker routes through compact selector and shared occupancy formatting", () => {
      const picker = read("components/admin/shared/planning/PlanningResourcePicker.tsx");
      expect(picker).toContain("CompactOperationalResourceSelector");
      const compact = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(compact).toContain("formatResourceOccupancyPrimaryLine");
    });

    it("useFacilityAvailability calls the single facilities availability API", () => {
      const hook = read("hooks/use-facility-availability.ts");
      expect(hook).toContain("/api/facilities/availability");
      expect(hook).toContain("availability-service.ts");
    });

    it("availability service aggregates training, match, and tournament in one Promise.all", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("findTrainingConflicts");
      expect(svc).toContain("findMatchConflicts");
      expect(svc).toContain("findTournamentConflicts");
      expect(svc).toMatch(/Promise\.all\(\[/);
    });
  });

  describe("create and edit route coverage", () => {
    it("training create and session edit use canonical facilities availability API", () => {
      expect(read("components/admin/training/TrainingSeriesCreateForm.tsx")).toMatch(
        /useFacilityAvailability|\/api\/facilities\/availability/,
      );
      expect(read("components/admin/training/TrainingSessionAllocationEditor.tsx")).toContain("useFacilityAvailability");
    });

    it("match create and edit use canonical facilities availability API", () => {
      expect(read("components/admin/matchcenter/MatchCreateForm.tsx")).toContain("/api/facilities/availability");
      expect(read("components/admin/matchcenter/MatchcenterDetailOperational.tsx")).toContain("useFacilityAvailability");
    });

    it("tournament create, saisonplanner, and tournament center edit consume useFacilityAvailability", () => {
      expect(read("components/admin/tournamentcenter/TournamentCreateForm.tsx")).toMatch(
        /useFacilityAvailability|\/api\/facilities\/availability/,
      );
      expect(read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx")).toContain("useFacilityAvailability");
      expect(read("components/admin/tournamentcenter/record/TurniereTournamentRecordWorkspace.tsx")).toContain(
        "useFacilityAvailability",
      );
    });

    it("series defaults without concrete interval stay neutral (no live fetch)", () => {
      const hook = read("hooks/use-facility-availability.ts");
      expect(hook).toContain("enabled && !!startAt");
      expect(hook).toContain("EMPTY_AVAILABILITY_MAP");
    });
  });

  describe("exclusion semantics — tournament participants (scenario H)", () => {
    const TEAM_A = "FC Allschwil Junioren F2";
    const E1 = "res-e1";

    it("intra-tournament participant occupancy preserved when excludeEventId clears API rows", () => {
      const participants = [
        {
          id: "p-a",
          displayName: TEAM_A,
          dressingRoomAllocations: [{ facilityResourceId: E1 }],
        },
        {
          id: "p-b",
          displayName: "Team B",
          dressingRoomAllocations: [],
        },
      ];
      const forTeamB = mergeTournamentParticipantDressingRoomAvailability(new Map(), participants, "p-b");
      const line = formatResourceOccupancyPrimaryLine(forTeamB.get(E1));
      expect(line).not.toBe("Frei");
      expect(line).toContain(TEAM_A);
    });
  });

  describe("sharing semantics", () => {
    it("occupied resources remain selectable in compact operational selector", () => {
      const compact = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(compact).not.toMatch(/isOccupied[\s\S]*disabled=\{true\}/);
    });
  });

  describe("club events / veranstaltungen", () => {
    it("club events (Event type OTHER) have no canonical FacilityResource allocation model in availability engine", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).not.toContain('type: "OTHER"');
      const club = read("lib/events/club-events-service.ts");
      expect(club).toContain('type: "OTHER"');
    });
  });

  describe("documentation", () => {
    it("documents PLANNING-UX-07R4B cross-event contract", () => {
      const doc = read("docs/planning/PLANNING-UX-07R4B-CROSS-EVENT-FACILITY-ENGINE.md");
      expect(doc).toContain("getResourceAvailability");
      expect(doc).toContain("TrainingSession");
      expect(doc).toContain("excludeEventId");
    });
  });
});
