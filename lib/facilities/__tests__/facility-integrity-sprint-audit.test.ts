import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("FACILITY-INTEGRITY sprint audit — operation wiring", () => {
  it("create/edit/delete facility and resource APIs call planner revalidation", () => {
    for (const rel of [
      "app/api/facilities/route.ts",
      "app/api/facilities/[facilityId]/resources/route.ts",
      "app/api/facilities/[facilityId]/resources/[resourceId]/route.ts",
      "app/api/facilities/[facilityId]/resources/[resourceId]/permanent/route.ts",
    ]) {
      expect(read(rel)).toContain("revalidateAfterSuccessfulFacilityMutation");
    }
    expect(read("lib/planning-hub/facility-mutation-revalidation.ts")).toMatch(
      /revalidatePath|revalidateTag/,
    );
  });

  it("domain services cover reference guards, validation, availability, and delete impact", () => {
    expect(read("lib/facilities/facility-resource-reference-guard.ts")).toContain("assert");
    expect(read("lib/facilities/facility-resource-write-validation.ts")).toContain("FacilityResource");
    expect(read("lib/facilities/availability-service.ts")).toContain("occupancy");
    expect(read("lib/facilities/facility-delete-service.ts")).toContain("DeletionImpact");
    expect(read("lib/facilities/display-helpers.ts")).toContain("getEventAllocationDisplayForTenant");
  });

  it("documents Hauptfeld/Hauptplatz read-only findings artifact", () => {
    const doc = read("docs/planning/FACILITY-INTEGRITY-SPRINT-HAUPTFELD-HAUPTPLATZ-FINDINGS.md");
    expect(doc).toContain("B — LEGACY + CANONICAL");
    expect(doc).toContain("LEGACY_CANONICAL_MAIN_PITCH_PAIR");
  });

  it("consumers resolve allocation by facilityResourceId", () => {
    expect(read("lib/planning-hub/facility-groups.ts")).toMatch(/facilityResourceId|FacilityResource/);
    expect(read("lib/publishing/presentation/allocation-display-resolver.ts")).toContain("pitchCode");
    expect(read("lib/facilities/__tests__/facility-mutation-08-08b.test.ts")).toContain(
      "revalidateAfterSuccessfulFacilityMutation",
    );
  });
});
