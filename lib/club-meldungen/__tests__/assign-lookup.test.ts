import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadClubMeldungAssignOptions } from "@/lib/club-meldungen/assign-lookup";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnit: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/roles/tenant-queries", () => ({
  getEligibleTenantMembers: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { getEligibleTenantMembers } from "@/lib/roles/tenant-queries";

describe("loadClubMeldungAssignOptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgUnit.findMany).mockReset();
    vi.mocked(getEligibleTenantMembers).mockReset();
  });

  it("returns scoped org units and active tenant members for pickers", async () => {
    vi.mocked(prisma.orgUnit.findMany).mockResolvedValue([
      { id: "ou-1", name: "Infrastruktur" },
    ] as never);
    vi.mocked(getEligibleTenantMembers).mockResolvedValue([
      {
        userId: "user-1",
        firstName: "Alex",
        lastName: "Muster",
        email: "alex@example.com",
        roleIds: [],
      },
    ]);

    const options = await loadClubMeldungAssignOptions("tenant-1");

    expect(options.orgUnits).toEqual([{ id: "ou-1", name: "Infrastruktur" }]);
    expect(options.members).toEqual([
      { id: "user-1", firstName: "Alex", lastName: "Muster" },
    ]);
    expect(prisma.orgUnit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", status: { not: "ARCHIVED" } },
      }),
    );
  });
});