import { describe, expect, it, vi } from "vitest";
import { buildReconciliationPlan } from "@/lib/facilities/fca-main-pitch-reconciliation";

describe("buildReconciliationPlan", () => {
  it("N — returns null plan when already consolidated", async () => {
    const prisma = {
      tenant: {
        findUnique: vi.fn(async () => ({ id: "t1", key: "fc-allschwil" })),
      },
      facility: {
        findMany: vi.fn(async () => [
          {
            id: "fac-hp",
            name: "Hauptplatz",
            type: "PITCH",
            status: "ACTIVE",
            resources: [
              { id: "r1", code: "STADION", name: "Hauptplatz", type: "FULL_PITCH", status: "ACTIVE" },
              { id: "r2", code: "STADION_A", name: "A", type: "HALF_PITCH", status: "ACTIVE" },
              { id: "r3", code: "STADION_B", name: "B", type: "HALF_PITCH", status: "ACTIVE" },
            ],
          },
        ]),
      },
      trainingAllocation: { count: vi.fn(async () => 0) },
      trainingSessionAllocation: { count: vi.fn(async () => 0) },
      tournamentResourceAllocation: { count: vi.fn(async () => 0) },
      tournamentParticipantAllocation: { count: vi.fn(async () => 0) },
      weekplannerPlanAllocation: { count: vi.fn(async () => 0) },
      eventFacilityAllocation: { count: vi.fn(async () => 0) },
      event: { count: vi.fn(async () => 0) },
    };

    const { plan, errors } = await buildReconciliationPlan(prisma as never);
    expect(errors).toEqual([]);
    expect(plan).toBeNull();
  });
});
