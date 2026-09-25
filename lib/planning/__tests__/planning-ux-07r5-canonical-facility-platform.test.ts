import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const ACTIVE_PLANNING_SURFACES: { domain: string; file: string; mustUse: string[]; mustNotUse?: string[] }[] = [
  {
    domain: "WOCHENPLAN",
    file: "components/admin/planner/WeekplannerAllocationOverrideEditor.tsx",
    mustUse: ["WeekplannerPlanningResourceSection", "/api/facilities/availability", "weekplannerPlanId"],
    mustNotUse: ["<FacilityResourceSelector"],
  },
  {
    domain: "TRAINING_SESSION",
    file: "components/admin/training/TrainingSessionAllocationEditor.tsx",
    mustUse: ["PlanningResourcePicker", "useFacilityAvailability"],
  },
  {
    domain: "TRAINING_CREATE",
    file: "components/admin/training/TrainingSeriesCreateForm.tsx",
    mustUse: ["/api/facilities/availability"],
  },
  {
    domain: "MATCH",
    file: "components/admin/matchcenter/MatchcenterDetailOperational.tsx",
    mustUse: ["useFacilityAvailability", "PlanningMatchDressingRoomAssignments"],
  },
  {
    domain: "MATCH_CREATE",
    file: "components/admin/matchcenter/MatchCreateForm.tsx",
    mustUse: ["/api/facilities/availability"],
  },
  {
    domain: "TOURNAMENT",
    file: "components/admin/tournamentcenter/TournamentCreateForm.tsx",
    mustUse: ["/api/facilities/availability"],
  },
  {
    domain: "VERANSTALTUNG_CREATE",
    file: "components/admin/veranstaltungen/VeranstaltungCreateForm.tsx",
    mustUse: ["PlanningSingleResourceAssignment", "useFacilityAvailability"],
  },
  {
    domain: "VERANSTALTUNG_EDIT",
    file: "components/admin/veranstaltungen/VeranstaltungEditForm.tsx",
    mustUse: ["VeranstaltungFacilityAllocationEditor", "useFacilityAvailability", "excludeEventId"],
  },
];

describe("PLANNING-UX-07R5 canonical facility platform", () => {
  describe("architecture sentinel — one read engine", () => {
    it("getResourceAvailability remains the sole server aggregator", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("export async function getResourceAvailability");
      expect(svc).toContain("timeRangesOverlap");
      expect(svc).not.toMatch(/function\s+findLocal.*Conflicts/);
    });

    it("active planning surfaces consume canonical availability API or hook", () => {
      for (const surface of ACTIVE_PLANNING_SURFACES) {
        const src = read(surface.file);
        for (const token of surface.mustUse) {
          expect(src, `${surface.domain} must use ${token}`).toContain(token);
        }
        for (const forbidden of surface.mustNotUse ?? []) {
          expect(src, `${surface.domain} must not use ${forbidden}`).not.toContain(forbidden);
        }
      }
    });

    it("documents authoritative R5 architecture", () => {
      const doc = read("docs/planning/PLANNING-UX-07R5-CANONICAL-FACILITY-PLATFORM.md");
      expect(doc).toContain("getResourceAvailability");
      expect(doc).toContain("facility-resource-write-validation");
      expect(doc).toContain("Veranstaltung");
    });
  });

  describe("shared write validation", () => {
    it("domain write services import shared facility resource validation", () => {
      for (const file of [
        "lib/training/training-allocation-service.ts",
        "lib/training/session-allocation-service.ts",
        "lib/tournaments/resource-allocation-service.ts",
        "lib/tournaments/participant-allocation-service.ts",
        "lib/weekplanner/plan-service.ts",
        "lib/events/event-facility-allocation-service.ts",
      ]) {
        expect(read(file)).toContain("facility-resource-write-validation");
      }
    });
  });

  describe("Wochenplan bidirectional contract", () => {
    it("plan-aware availability uses effective-plan integration without duplicate canonical queries", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("findWeekplannerPlanConflicts");
      expect(svc).toContain("findWeekplannerReplacedActivities");
      expect(svc).toMatch(/useEffectivePlanOccupancy[\s\S]*findWeekplannerPlanConflicts/);
    });

    it("global planners without plan context use canonical persisted sources only", () => {
      const hook = read("hooks/use-facility-availability.ts");
      expect(hook).toContain("weekplannerPlanId");
      expect(read("components/admin/training/TrainingSessionAllocationEditor.tsx")).not.toContain(
        "weekplannerPlanId:",
      );
    });
  });

  describe("Veranstaltung domain (R6)", () => {
    it("club events use EventFacilityAllocation write service and canonical availability source", () => {
      expect(read("lib/events/event-facility-allocation-service.ts")).toContain(
        "assignEventFacilityResource",
      );
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("findVeranstaltungConflicts");
      expect(svc).toContain("EventFacilityAllocation");
    });

    it("domain write service imports shared facility resource validation", () => {
      expect(read("lib/events/event-facility-allocation-service.ts")).toContain(
        "facility-resource-write-validation",
      );
    });
  });

  describe("prior R4B regression sentinels preserved", () => {
    it("R4B cross-event test file still present", () => {
      expect(read("lib/planning/__tests__/planning-ux-07r4b-cross-event-facility-engine.test.ts")).toContain(
        "PLANNING-UX-07R4B",
      );
    });
  });
});
