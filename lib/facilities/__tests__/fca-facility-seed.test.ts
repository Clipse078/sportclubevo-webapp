import { describe, expect, it, vi } from "vitest";
import {
  resolveFcaFacilityForSeed,
  type FcaFacilitySeedDefinition,
} from "@/lib/facilities/fca-facility-seed";

const mainPitchDef: FcaFacilitySeedDefinition = {
  name: "Hauptfeld",
  type: "PITCH",
  sortOrder: 10,
  resources: [
    { name: "Hauptfeld", code: "STADION", type: "FULL_PITCH", sortOrder: 10 },
    { name: "Hauptfeld A", code: "STADION_A", type: "HALF_PITCH", sortOrder: 20 },
    { name: "Hauptfeld B", code: "STADION_B", type: "HALF_PITCH", sortOrder: 30 },
  ],
};

describe("resolveFcaFacilityForSeed (FACILITY-INTEGRITY-01A)", () => {
  it("M — anchors main pitch to legacy HAUPTFELD facility instead of creating a duplicate facility row", async () => {
    const prisma = {
      facilityResource: {
        findUnique: vi.fn(async ({ where }: { where: { tenantId_code: { code: string } } }) => {
          if (where.tenantId_code.code === "STADION") return null;
          if (where.tenantId_code.code === "HAUPTFELD") {
            return { facilityId: "legacy-fac-id" };
          }
          return null;
        }),
      },
      facility: {
        findFirst: vi.fn(),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: { name: string } }) => ({
          id: where.id,
          ...data,
        })),
        create: vi.fn(),
      },
    };

    const facility = await resolveFcaFacilityForSeed(prisma as never, "tenant-fca", mainPitchDef);

    expect(facility.id).toBe("legacy-fac-id");
    expect(prisma.facility.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "legacy-fac-id" },
        data: expect.objectContaining({ name: "Hauptfeld" }),
      }),
    );
    expect(prisma.facility.create).not.toHaveBeenCalled();
  });

  it("anchors to existing STADION facility when present", async () => {
    const prisma = {
      facilityResource: {
        findUnique: vi.fn(async ({ where }: { where: { tenantId_code: { code: string } } }) => {
          if (where.tenantId_code.code === "STADION") {
            return { facilityId: "canonical-fac-id" };
          }
          return null;
        }),
      },
      facility: {
        findFirst: vi.fn(),
        update: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, name: "Hauptfeld" })),
        create: vi.fn(),
      },
    };

    const facility = await resolveFcaFacilityForSeed(prisma as never, "tenant-fca", mainPitchDef);
    expect(facility.id).toBe("canonical-fac-id");
    expect(prisma.facility.create).not.toHaveBeenCalled();
  });
});
