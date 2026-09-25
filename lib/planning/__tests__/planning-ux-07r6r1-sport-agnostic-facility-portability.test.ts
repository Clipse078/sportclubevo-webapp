import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FACILITY_RESOURCE_TYPES_BY_AVAILABILITY_GROUP,
  facilityResourceTypesForAvailabilityGroup,
  isGenericAllocatableFacilityResourceType,
} from "@/lib/facilities/facility-resource-classification";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R6R1 sport-agnostic facility portability", () => {
  describe("persistence model", () => {
    it("FacilityResource is generic (no sport-specific columns)", () => {
      const schema = read("prisma/schema.prisma");
      const block = schema.slice(schema.indexOf("model FacilityResource"), schema.indexOf("model WochenplanPublication"));
      expect(block).toContain("type       FacilityResourceType");
      expect(block).not.toMatch(/pitchCode|sportType|football/i);
    });

    it("EventFacilityAllocation references FacilityResource only", () => {
      const schema = read("prisma/schema.prisma");
      const block = schema.slice(
        schema.indexOf("model EventFacilityAllocation"),
        schema.indexOf("// ============================================================================="),
      );
      expect(block).toContain("facilityResourceId String");
      expect(block).not.toMatch(/pitch|hallCode|court/i);
    });
  });

  describe("portability test matrix", () => {
    it("FOOTBALL_PITCH — FULL_PITCH maps to primary playable group", () => {
      expect(classifyFacilityResourceType("FULL_PITCH")).toBe("PITCH_HALL");
      expect(facilityResourceTypesForAvailabilityGroup("PITCH_HALL")).toContain("FULL_PITCH");
    });

    it("SPORTS_HALL — HALF_PITCH sections use same availability group as full pitches", () => {
      expect(classifyFacilityResourceType("HALF_PITCH")).toBe("PITCH_HALL");
    });

    it("DRESSING_ROOM — dedicated group", () => {
      expect(classifyFacilityResourceType("DRESSING_ROOM")).toBe("DRESSING_ROOM");
    });

    it("GENERIC_COURT — OTHER type participates without a separate availability engine", () => {
      expect(classifyFacilityResourceType("OTHER")).toBe("OTHER");
      expect(FACILITY_RESOURCE_TYPES_BY_AVAILABILITY_GROUP.OTHER).toEqual(["OTHER"]);
      expect(read("lib/facilities/availability-service.ts")).toContain(
        "facilityResourceTypesForAvailabilityGroup",
      );
      expect(read("app/api/facilities/availability/route.ts")).toContain('"OTHER"');
    });

    it("GENERIC_BOOKABLE_RESOURCE — Veranstaltung write path accepts OTHER", () => {
      const svc = read("lib/events/event-facility-allocation-service.ts");
      expect(svc).toContain("isGenericAllocatableFacilityResourceType");
      expect(svc).not.toContain('group === "OTHER"');
      expect(isGenericAllocatableFacilityResourceType("OTHER")).toBe(true);
    });
  });

  describe("canonical availability contract", () => {
    it("getResourceAvailability filters by tenant and resource type group, not sport", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("tenantId");
      expect(svc).toContain("facilityResourceId");
      expect(svc).not.toMatch(/tenant.*football|FCA/i);
    });

    it("MATCH legacy adapter preserved", () => {
      expect(read("lib/facilities/availability-service.ts")).toContain("pitchCode");
      expect(read("lib/facilities/availability-service.ts")).toContain("findMatchConflicts");
    });
  });

  describe("five-domain regression sentinels", () => {
    const keys = [
      "findVeranstaltungConflicts",
      "findTrainingConflicts",
      "findMatchConflicts",
      "findTournamentConflicts",
      "collectVeranstaltungOccupants",
    ] as const;

    it("single read engine still aggregates all domains", () => {
      const svc = read("lib/facilities/availability-service.ts");
      for (const key of keys) {
        expect(svc).toContain(key);
      }
    });
  });

  describe("migration safety", () => {
    it("R6 migration unchanged (sport-agnostic table already)", () => {
      const migration = read(
        "prisma/migrations/20260925120000_planning_ux_07r6_event_facility_allocation/migration.sql",
      );
      expect(migration).toContain("EventFacilityAllocation");
      expect(migration).not.toMatch(/FULL_PITCH|football/i);
    });

    it("documents R6R1 architecture", () => {
      const doc = read("docs/planning/PLANNING-UX-07R6R1-SPORT-AGNOSTIC-FACILITY-PORTABILITY.md");
      expect(doc).toContain("FacilityResource");
      expect(doc).toContain("PITCH_HALL");
      expect(doc).toContain("EventFacilityAllocation");
    });
  });
});
