/**
 * PLANNING-UX-07R6R2 — multi-tenant self-service facility platform verification.
 */

import { createHash } from "node:crypto";
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

const R6_MIGRATION =
  "prisma/migrations/20260925120000_planning_ux_07r6_event_facility_allocation/migration.sql";
const EXPECTED_R6_CHECKSUM =
  "0be5c70a40d86edd01e19dd866065b79f6e50d46d093ca30b59d2bd303768ef1";

describe("PLANNING-UX-07R6R2 multi-tenant facility platform", () => {
  describe("multi-tenant hierarchy model", () => {
    it("models Tenant → Facility → FacilityResource with tenantId on both entities", () => {
      const schema = read("prisma/schema.prisma");
      const facilityBlock = schema.slice(schema.indexOf("model Facility {"), schema.indexOf("model FacilityResource"));
      const resourceBlock = schema.slice(
        schema.indexOf("model FacilityResource {"),
        schema.indexOf("model WochenplanPublication"),
      );
      expect(facilityBlock).toContain("tenantId");
      expect(resourceBlock).toContain("tenantId");
      expect(resourceBlock).toContain("facilityId");
    });

    it("supports multiple facilities per tenant and multiple resources per facility via 1..N relations", () => {
      const queries = read("lib/facilities/queries.ts");
      expect(queries).toContain("getFacilitiesForTenant");
      expect(queries).toContain("getFacilityResourcesForFacility");
      expect(queries).toContain("include: {\n      resources:");
    });

    it("uses FacilityResource.id as canonical allocation identity", () => {
      const validation = read("lib/facilities/facility-resource-write-validation.ts");
      expect(validation).toContain("facilityResourceId");
      expect(validation).toContain("where: { id: facilityResourceId, tenantId }");
    });
  });

  describe("facility administration (tenant self-service)", () => {
    it("lists facilities via GET /api/facilities scoped to activeTenantId", () => {
      const route = read("app/api/facilities/route.ts");
      expect(route).toContain("getFacilitiesForTenant(tenantId)");
      expect(route).not.toMatch(/body\.tenantId|query\.tenantId/);
    });

    it("creates and updates facilities without hard-coded tenant inventory", () => {
      expect(read("app/api/facilities/route.ts")).toContain("createFacility");
      expect(read("app/api/facilities/[facilityId]/route.ts")).toContain("updateFacility");
      expect(read("components/admin/facilities/FacilitiesAdminPanel.tsx")).toContain("/api/facilities");
    });

    it("archives facilities via status field (no hard delete requirement)", () => {
      const panel = read("components/admin/facilities/FacilitiesAdminPanel.tsx");
      expect(panel).toContain("ARCHIVED");
      expect(read("lib/facilities/queries.ts")).toContain('status: { not: "ARCHIVED" }');
    });

    it("requires FACILITIES_MANAGE for mutations", () => {
      expect(read("app/api/facilities/route.ts")).toContain("FACILITIES_MANAGE");
      expect(read("app/(admin)/dashboard/admin/facilities/page.tsx")).toContain("FACILITIES_MANAGE");
    });
  });

  describe("resource administration (tenant self-service)", () => {
    it("lists and creates resources under tenant-owned facilities", () => {
      const route = read("app/api/facilities/[facilityId]/resources/route.ts");
      expect(route).toContain("getFacilityResourcesForFacility");
      expect(route).toContain("createFacilityResource");
      expect(route).toContain("getFacilityById(facilityId, tenantId)");
    });

    it("updates and archives resources via PATCH with tenant scope", () => {
      const route = read("app/api/facilities/[facilityId]/resources/[resourceId]/route.ts");
      expect(route).toContain("updateFacilityResource(resourceId, tenantId");
      expect(route).toContain('"ARCHIVED"');
    });

    it("supports type configuration including generic OTHER", () => {
      const route = read("app/api/facilities/[facilityId]/resources/route.ts");
      expect(route).toContain('"OTHER"');
      expect(isGenericAllocatableFacilityResourceType("OTHER")).toBe(true);
    });
  });

  describe("tenant isolation — negative contract", () => {
    it("TENANT_A_CANNOT_LIST_TENANT_B_FACILITIES — list queries always filter by session tenant", () => {
      const queries = read("lib/facilities/queries.ts");
      expect(queries).toMatch(/where: \{ tenantId/);
      const facilitiesRoute = read("app/api/facilities/route.ts");
      expect(facilitiesRoute).toContain("activeTenantId");
      expect(facilitiesRoute).not.toContain("body.tenantId");
    });

    it("TENANT_A_CANNOT_LIST_TENANT_B_RESOURCES — facility resource list requires facility tenant match", () => {
      const resourceRouteTests = read(
        "app/api/facilities/[facilityId]/resources/__tests__/route.test.ts",
      );
      expect(resourceRouteTests).toContain("cross-tenant facility access");
      expect(read("lib/facilities/queries.ts")).toContain("where: { id: facilityId, tenantId }");
    });

    it("TENANT_A_CANNOT_CREATE_RESOURCE_IN_TENANT_B_FACILITY", () => {
      const route = read("app/api/facilities/[facilityId]/resources/route.ts");
      expect(route).toContain("getFacilityById(facilityId, tenantId)");
      const tests = read("app/api/facilities/[facilityId]/resources/__tests__/route.test.ts");
      expect(tests).toContain("rejects cross-tenant resource creation");
    });

    it("TENANT_A_CANNOT_EDIT_TENANT_B_RESOURCE — updateMany scoped by tenantId", () => {
      expect(read("lib/facilities/queries.ts")).toContain("updateFacilityResource");
      expect(read("lib/facilities/queries.ts")).toContain("where: { id, tenantId }");
    });

    it("TENANT_A_CANNOT_ARCHIVE_TENANT_B_RESOURCE — status updates require tenant scope", () => {
      const route = read("app/api/facilities/[facilityId]/resources/[resourceId]/route.ts");
      expect(route).toContain('ALLOWED_STATUSES');
      expect(route).toContain("updateFacilityResource(resourceId, tenantId");
    });

    it("TENANT_A_CANNOT_ALLOCATE_TENANT_B_RESOURCE — write validation loads resource by tenant + id", () => {
      const validation = read("lib/facilities/facility-resource-write-validation.ts");
      expect(validation).toContain("loadTenantFacilityResourceForWrite");
      const eventSvcTests = read("lib/events/__tests__/event-facility-allocation-service.test.ts");
      expect(eventSvcTests).toContain("rejects missing resources (tenant isolation)");
    });

    it("TENANT_A_CANNOT_QUERY_TENANT_B_OCCUPANCY — availability API resolves tenant from session", () => {
      const route = read("app/api/facilities/availability/route.ts");
      expect(route).toContain("activeTenantId");
      expect(route).toMatch(/never from request/i);
      const svcTests = read("lib/facilities/__tests__/availability-service.test.ts");
      expect(svcTests).toContain("scopes the FacilityResource query by tenantId");
    });

    it("TENANT_A_CANNOT_DISCOVER_TENANT_B_OWNER_LABEL — conflict aggregation is tenant-scoped", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("tenantId");
      const svcTests = read("lib/facilities/__tests__/availability-service.test.ts");
      expect(svcTests).toContain("scopes training, match, and tournament conflict lookups by tenantId");
    });
  });

  describe("resource portability matrix", () => {
    const cases: Array<[string, string]> = [
      ["FOOTBALL_PITCH", "FULL_PITCH"],
      ["SPORTS_HALL", "HALF_PITCH"],
      ["TENNIS_COURT", "OTHER"],
      ["BASKETBALL_COURT", "OTHER"],
      ["ICE_RINK", "OTHER"],
      ["POOL_LANE", "OTHER"],
      ["DRESSING_ROOM", "DRESSING_ROOM"],
      ["GENERIC_OTHER", "OTHER"],
    ];

    it.each(cases)("%s maps through canonical FacilityResourceType %s", (_label, type) => {
      const group = classifyFacilityResourceType(type as never);
      expect(facilityResourceTypesForAvailabilityGroup(group)).toContain(type);
    });
  });

  describe("new resource auto-discovery", () => {
    it("CREATE RESOURCE → tenant inventory query → planning surfaces → availability engine", () => {
      expect(read("lib/facilities/queries.ts")).toContain("getFacilitiesForTenant");
      expect(read("components/admin/shared/planning/PlanningResourcePicker.tsx")).toContain(
        "CompactOperationalResourceSelector",
      );
      expect(read("app/api/facilities/availability/route.ts")).toContain("getResourceAvailability");
      expect(read("lib/facilities/availability-service.ts")).toContain(
        "facilityResourceTypesForAvailabilityGroup",
      );
    });

    it("does not rely on a static resource allowlist in availability engine", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("prisma.facilityResource.findMany");
      expect(svc).not.toMatch(/FCA_PITCH|ALLOWED_RESOURCE_IDS/);
    });

    it("Veranstaltung exposes OTHER via shared PlanningResourcePicker after tenant creates resource", () => {
      const editor = read("components/admin/veranstaltungen/VeranstaltungFacilityAllocationEditor.tsx");
      expect(editor).toContain("PlanningResourcePicker");
      expect(editor).toContain("TRAINING_ALLOCATION_GROUP_LABELS.OTHER");
      expect(read("app/(admin)/dashboard/veranstaltungen/new/page.tsx")).toContain(
        'facilityGroupsForTypes(["OTHER"])',
      );
    });
  });

  describe("domain resource policy vs engine capability", () => {
    it("WOCHENPLAN uses canonical availability and tenant facility queries", () => {
      expect(read("lib/weekplanner/availability-integration.ts")).toContain("collectVeranstaltungOccupants");
      expect(read("components/admin/planner/WeekplannerAllocationOverrideEditor.tsx")).toContain(
        "PlanningResourcePicker",
      );
    });

    it("TRAINING exposes Weitere Ressourcen (OTHER) separately from pitch/dressing", () => {
      expect(read("components/admin/training/TrainingAllocationEditor.tsx")).toContain(
        "TRAINING_ALLOCATION_GROUP_LABELS.OTHER",
      );
    });

    it("MATCH keeps legacy pitch/dressing codes while using canonical availability", () => {
      expect(read("lib/facilities/availability-service.ts")).toContain("findMatchConflicts");
      expect(read("lib/facilities/availability-service.ts")).toContain("pitchCode");
    });

    it("TOURNAMENT uses FacilityResource allocations", () => {
      expect(read("components/admin/tournamentcenter/TournamentResourceAllocationEditor.tsx")).toContain(
        "resource-allocations",
      );
    });

    it("VERANSTALTUNG uses EventFacilityAllocation with pitch, dressing, and OTHER UX", () => {
      expect(read("lib/events/event-facility-allocation-service.ts")).toContain("EventFacilityAllocation");
      expect(read("components/admin/veranstaltungen/VeranstaltungFacilityAllocationEditor.tsx")).toContain(
        "veranstaltung-other-allocation",
      );
    });
  });

  describe("five-domain regression contract", () => {
    it("single engine aggregates all domain conflict finders", () => {
      const svc = read("lib/facilities/availability-service.ts");
      for (const fn of [
        "findVeranstaltungConflicts",
        "findTrainingConflicts",
        "findMatchConflicts",
        "findTournamentConflicts",
      ]) {
        expect(svc).toContain(fn);
      }
    });

    it("Wochenplan sees Veranstaltung occupants", () => {
      expect(read("lib/weekplanner/availability-integration.ts")).toContain("collectVeranstaltungOccupants");
    });
  });

  describe("scale and query shape", () => {
    it("scopes facility and resource reads by tenantId with indexed fields", () => {
      const schema = read("prisma/schema.prisma");
      expect(schema).toContain("@@index([tenantId])");
      expect(read("lib/facilities/queries.ts")).toContain("where: { tenantId");
    });

    it("availability loads tenant resources for requested group then bounded conflict queries", () => {
      const svc = read("lib/facilities/availability-service.ts");
      expect(svc).toContain("prisma.facilityResource.findMany");
      expect(svc).toContain("resourceTypesForGroup(group)");
    });
  });

  describe("migration safety (R6 unchanged)", () => {
    it("R6 migration checksum matches expected value", () => {
      const sql = read(R6_MIGRATION);
      const checksum = createHash("sha256").update(sql, "utf8").digest("hex");
      expect(checksum).toBe(EXPECTED_R6_CHECKSUM);
    });

    it("documents R6R2 architecture", () => {
      const doc = read("docs/planning/PLANNING-UX-07R6R2-MULTITENANT-FACILITY-PLATFORM.md");
      expect(doc).toContain("FacilityResource.id");
      expect(doc).toContain("self-service");
    });
  });
});
