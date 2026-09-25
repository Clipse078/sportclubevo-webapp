import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("PLANNING-UX-07R6 Veranstaltung facility allocation", () => {
  describe("persistence forensics", () => {
    it("uses EventFacilityAllocation rather than reusing tournament tables for OTHER events", () => {
      expect(read("prisma/schema.prisma")).toContain("model EventFacilityAllocation");
      const svc = read("lib/events/event-facility-allocation-service.ts");
      expect(svc).toContain('type: "OTHER"');
      expect(svc).not.toContain("tournamentResourceAllocation");
    });
  });

  describe("architecture sentinel — five domains", () => {
    const domains = ["WOCHENPLAN", "TRAINING", "MATCH", "TOURNAMENT", "VERANSTALTUNG"] as const;

    it("canonical read engine lists Veranstaltung source", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("findVeranstaltungConflicts");
      expect(svc).toContain('"VERANSTALTUNG"');
    });

    it("weekplanner effective collector includes Veranstaltung allocations", () => {
      const integration = read("lib/weekplanner/availability-integration.ts");
      expect(integration).toContain("collectVeranstaltungOccupants");
      expect(integration).toContain("eventFacilityAllocation.findMany");
    });

    it("covers all five planning domains in R6 documentation contract", () => {
      const doc = read("docs/planning/PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md");
      for (const domain of domains) {
        expect(doc).toContain(domain);
      }
    });
  });

  describe("cross-domain matrix (sentinel)", () => {
    const matrix = [
      "MATCH_SEES_VERANSTALTUNG",
      "TRAINING_SEES_VERANSTALTUNG",
      "TOURNAMENT_SEES_VERANSTALTUNG",
      "WOCHENPLAN_SEES_VERANSTALTUNG",
      "VERANSTALTUNG_SEES_TRAINING",
      "VERANSTALTUNG_SEES_MATCH",
      "VERANSTALTUNG_SEES_TOURNAMENT",
      "VERANSTALTUNG_SEES_VERANSTALTUNG",
    ] as const;

    it("documents and tests cross-domain visibility contract", () => {
      const doc = read("docs/planning/PLANNING-UX-07R6-VERANSTALTUNG-FACILITY-ALLOCATION.md");
      const engine = read("lib/facilities/__tests__/availability-service-cross-event.test.ts");
      for (const key of matrix) {
        expect(doc).toContain(key);
      }
      expect(engine).toContain("eventFacilityAllocation");
    });
  });

  describe("Veranstaltung create/edit UX", () => {
    it("uses shared PlanningSingleResourceAssignment with live availability", () => {
      expect(read("components/admin/veranstaltungen/VeranstaltungCreateForm.tsx")).toMatch(
        /PlanningSingleResourceAssignment[\s\S]*useFacilityAvailability/,
      );
      expect(read("components/admin/veranstaltungen/VeranstaltungEditForm.tsx")).toContain(
        "VeranstaltungFacilityAllocationEditor",
      );
    });
  });

  describe("MATCH legacy persistence unchanged", () => {
    it("match conflicts still use legacy Event code fields in availability engine", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("pitchCode");
      expect(svc).toContain("findMatchConflicts");
    });
  });

  describe("migration safety", () => {
    it("creates forward-only migration without STAGE apply scripts", () => {
      const migration = read(
        "prisma/migrations/20260925120000_planning_ux_07r6_event_facility_allocation/migration.sql",
      );
      expect(migration).toContain("CREATE TABLE");
      expect(migration).not.toMatch(/DROP TABLE/i);
    });
  });
});
