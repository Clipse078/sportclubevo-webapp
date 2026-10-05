import { describe, expect, it, vi } from "vitest";
import {
  buildFcaMainPitchTerminologyPlan,
  executeFcaMainPitchTerminologyReconciliation,
} from "@/lib/facilities/fca-main-pitch-terminology-reconciliation";

describe("fca-main-pitch-terminology-reconciliation", () => {
  it("plans Hauptplatz → Hauptfeld renames for STADION* resources", async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn(async () => ({ id: "t1" })),
      },
      facility: {
        findMany: vi.fn(async () => [
          {
            id: "fac-main",
            name: "Hauptplatz",
            type: "PITCH",
            status: "ACTIVE",
            resources: [
              { id: "r1", code: "STADION", name: "Hauptplatz", status: "ACTIVE" },
              { id: "r2", code: "STADION_A", name: "Hauptplatz A", status: "ACTIVE" },
              { id: "r3", code: "STADION_B", name: "Hauptplatz B", status: "ACTIVE" },
            ],
          },
        ]),
      },
    };

    const { plan, errors } = await buildFcaMainPitchTerminologyPlan(prisma as never);
    expect(errors).toEqual([]);
    expect(plan?.alreadyCanonical).toBe(false);
    expect(plan?.targets).toHaveLength(4);
    expect(plan?.targets.map((t) => t.toName)).toEqual([
      "Hauptfeld",
      "Hauptfeld",
      "Hauptfeld A",
      "Hauptfeld B",
    ]);
  });

  it("is idempotent when names are already canonical", async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn(async () => ({ id: "t1" })),
      },
      facility: {
        findMany: vi.fn(async () => [
          {
            id: "fac-main",
            name: "Hauptfeld",
            type: "PITCH",
            status: "ACTIVE",
            resources: [
              { id: "r1", code: "STADION", name: "Hauptfeld", status: "ACTIVE" },
              { id: "r2", code: "STADION_A", name: "Hauptfeld A", status: "ACTIVE" },
              { id: "r3", code: "STADION_B", name: "Hauptfeld B", status: "ACTIVE" },
            ],
          },
        ]),
      },
    };

    const { plan, errors } = await buildFcaMainPitchTerminologyPlan(prisma as never);
    expect(errors).toEqual([]);
    expect(plan?.alreadyCanonical).toBe(true);
    expect(plan?.targets).toEqual([]);
  });

  it("dry-run does not write", async () => {
    const updateFacility = vi.fn();
    const updateResource = vi.fn();
    const prisma = {
      tenant: {
        findUnique: vi.fn(async () => ({ id: "t1" })),
      },
      facility: {
        findMany: vi.fn(async () => [
          {
            id: "fac-main",
            name: "Hauptplatz",
            type: "PITCH",
            status: "ACTIVE",
            resources: [
              { id: "r1", code: "STADION", name: "Hauptplatz", status: "ACTIVE" },
              { id: "r2", code: "STADION_A", name: "A", status: "ACTIVE" },
              { id: "r3", code: "STADION_B", name: "B", status: "ACTIVE" },
            ],
          },
        ]),
        update: updateFacility,
      },
      facilityResource: { update: updateResource },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          facility: { update: updateFacility },
          facilityResource: { update: updateResource },
        }),
      ),
    };

    const result = await executeFcaMainPitchTerminologyReconciliation(prisma as never, "dry-run");
    expect(result.success).toBe(true);
    expect(updateFacility).not.toHaveBeenCalled();
    expect(updateResource).not.toHaveBeenCalled();
  });
});
