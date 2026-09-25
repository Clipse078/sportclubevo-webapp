import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    facilityResource: { findFirst },
  },
}));

import {
  loadTenantFacilityResourceForWrite,
  validateAssignableFacilityResource,
  validateFacilityResourceAllocationGroup,
} from "../facility-resource-write-validation";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("facility-resource-write-validation", () => {
  it("loads tenant-scoped resource rows for write validation", async () => {
    findFirst.mockResolvedValue({
      id: "res-1",
      tenantId: "t1",
      status: "ACTIVE",
      type: "FULL_PITCH",
      facility: { id: "f1", status: "ACTIVE" },
    });
    await loadTenantFacilityResourceForWrite("t1", "res-1");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "res-1", tenantId: "t1" },
      }),
    );
  });

  it("detects archive and group mismatch issues", () => {
    expect(validateAssignableFacilityResource(null)).toBe("NOT_FOUND");
    expect(
      validateAssignableFacilityResource({
        id: "r",
        tenantId: "t",
        status: "ARCHIVED",
        type: "FULL_PITCH",
        facility: { id: "f", status: "ACTIVE" },
      }),
    ).toBe("ARCHIVED_RESOURCE");
    const active = {
      id: "r",
      tenantId: "t",
      status: "ACTIVE",
      type: "DRESSING_ROOM" as const,
      facility: { id: "f", status: "ACTIVE" },
    };
    expect(validateFacilityResourceAllocationGroup(active, "PITCH_HALL")).toBe("GROUP_MISMATCH");
    expect(validateFacilityResourceAllocationGroup(active, "DRESSING_ROOM")).toBeNull();
  });
});
