import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ResourceAvailabilityAnnotation } from "@/components/admin/training/FacilityResourceSelector";
import {
  buildTournamentParticipantDressingRoomAvailabilityByParticipant,
  formatResourceOccupancyPrimaryLine,
  mergeTournamentParticipantDressingRoomAvailability,
} from "@/lib/planning/resource-occupancy-presentation";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const TEAM_A = "FC Allschwil Junioren F2";
const TEAM_B = "US Olympia 1963";
const E1 = "res-e1";
const E2 = "res-e2";

function participant(id: string, displayName: string, resourceIds: string[]) {
  return {
    id,
    displayName,
    dressingRoomAllocations: resourceIds.map((facilityResourceId) => ({ facilityResourceId })),
  };
}

describe("PLANNING-UX-07R3 shared resource occupancy", () => {
  describe("tournament dressing rooms", () => {
    const participants = [
      participant("p-a", TEAM_A, [E1]),
      participant("p-b", TEAM_B, []),
    ];

    it("Team B candidate E1 is not Frei and identifies Team A", () => {
      const base = new Map<string, ResourceAvailabilityAnnotation>();
      const forTeamB = mergeTournamentParticipantDressingRoomAvailability(base, participants, "p-b");
      const line = formatResourceOccupancyPrimaryLine(forTeamB.get(E1));
      expect(line).not.toBe("Frei");
      expect(line).toContain(TEAM_A);
    });

    it("Team A row keeps E1 as current subject (not Frei)", () => {
      const forTeamA = mergeTournamentParticipantDressingRoomAvailability(new Map(), participants, "p-a");
      const line = formatResourceOccupancyPrimaryLine(forTeamA.get(E1), { isSelected: true });
      expect(line).not.toBe("Frei");
      expect(line).toContain(TEAM_A);
    });

    it("E2 with no allocation shows Frei", () => {
      const forTeamB = mergeTournamentParticipantDressingRoomAvailability(new Map(), participants, "p-b");
      const annotation = forTeamB.get(E2);
      expect(annotation?.status ?? "FREE").toBe("FREE");
      expect(formatResourceOccupancyPrimaryLine(annotation)).toBe("Frei");
    });

    it("shared E1 represents both teams when selected on both rows", () => {
      const both = [
        participant("p-a", TEAM_A, [E1]),
        participant("p-b", TEAM_B, [E1]),
      ];
      const forA = mergeTournamentParticipantDressingRoomAvailability(new Map(), both, "p-a");
      const forB = mergeTournamentParticipantDressingRoomAvailability(new Map(), both, "p-b");
      expect(formatResourceOccupancyPrimaryLine(forA.get(E1), { isSelected: true })).toContain("Geteilt mit");
      expect(formatResourceOccupancyPrimaryLine(forB.get(E1), { isSelected: true })).toContain("Geteilt mit");
      expect(formatResourceOccupancyPrimaryLine(forA.get(E1))).not.toBe("Frei");
      expect(formatResourceOccupancyPrimaryLine(forB.get(E1))).not.toBe("Frei");
    });

    it("allocation changes update occupancy representation", () => {
      const initial = buildTournamentParticipantDressingRoomAvailabilityByParticipant(new Map(), participants);
      expect(formatResourceOccupancyPrimaryLine(initial.get("p-b")?.get(E1))).toContain(TEAM_A);

      const updatedParticipants = [
        participant("p-a", TEAM_A, [E2]),
        participant("p-b", TEAM_B, []),
      ];
      const updated = buildTournamentParticipantDressingRoomAvailabilityByParticipant(new Map(), updatedParticipants);
      expect(updated.get("p-b")?.get(E1)?.status ?? "FREE").toBe("FREE");
      expect(formatResourceOccupancyPrimaryLine(updated.get("p-b")?.get(E2))).toContain(TEAM_A);
    });
  });

  describe("architecture and performance", () => {
    it("uses shared resource-occupancy-presentation resolver module", () => {
      const assignments = read("components/admin/shared/planning/PlanningSubjectDressingRoomAssignments.tsx");
      expect(assignments).toContain("buildTournamentParticipantDressingRoomAvailabilityByParticipant");
      const compact = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(compact).toContain("formatResourceOccupancyPrimaryLine");
    });

    it("does not introduce per-participant availability fetch loops in dressing-room panel", () => {
      const panel = read("components/admin/tournamentcenter/TournamentParticipantDressingRoomPanel.tsx");
      const assignments = read("components/admin/shared/planning/PlanningSubjectDressingRoomAssignments.tsx");
      expect(assignments).toContain("buildTournamentParticipantDressingRoomAvailabilityByParticipant");
      expect(panel).not.toContain("useFacilityAvailability");
      expect(panel).not.toMatch(/participants\.map[\s\S]*\/api\/facilities\/availability/s);
      expect(assignments).toContain("useMemo");
    });

    it("occupied resources remain selectable in compact operational selector", () => {
      const compact = read("components/admin/shared/planning/CompactOperationalResourceSelector.tsx");
      expect(compact).not.toMatch(/isOccupied[\s\S]*disabled=\{true\}/);
      expect(compact).toContain("aria-pressed");
    });
  });

  describe("time overlap and security (canonical availability service)", () => {
    it("availability service uses canonical timeRangesOverlap primitive", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("timeRangesOverlap");
    });

    it("availability queries remain tenant scoped", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("tenantId");
      expect(svc).toMatch(/Every query below is scoped by tenantId/);
    });
  });

  describe("match, training, tournament pitch surfaces", () => {
    it("matchcenter uses shared occupancy formatting", () => {
      const match = read("components/admin/matchcenter/MatchcenterDetailOperational.tsx");
      expect(match).toContain("formatAvailabilitySuffix");
      expect(match).toContain("useFacilityAvailability");
      const selector = read("components/admin/training/FacilityResourceSelector.tsx");
      expect(selector).toContain("formatResourceOccupancyPrimaryLine");
    });

    it("training session allocation uses canonical facility availability hook", () => {
      const training = read("components/admin/training/TrainingSessionAllocationEditor.tsx");
      expect(training).toContain("useFacilityAvailability");
      expect(training).toContain("excludeTrainingSessionId");
    });

    it("tournament pitch allocation receives availability map from shared hook", () => {
      const editor = read("components/admin/tournamentcenter/TournamentResourceAllocationEditor.tsx");
      const workspace = read("components/admin/planner/PlannerTournamentCanonicalWorkspace.tsx");
      expect(editor).toContain("availabilityByResourceId");
      expect(workspace).toContain("useFacilityAvailability");
    });
  });

  describe("documentation", () => {
    it("documents PLANNING-UX-07R3 contract", () => {
      const doc = read("docs/planning/PLANNING-UX-07R3-SHARED-RESOURCE-OCCUPANCY.md");
      expect(doc).toContain("FREE");
      expect(doc).toContain("SHARED");
      expect(doc).toContain("excludeEventId");
    });
  });
});
