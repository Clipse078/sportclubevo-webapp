import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  browseDiscoverableTenantPersons,
  searchDiscoverableTenantPersons,
} from "@/lib/people/tenant-person-discovery";

const mocks = vi.hoisted(() => ({
  personFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    person: {
      findMany: mocks.personFindMany,
    },
  },
}));

describe("tenant-person-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("browse returns active tenant persons ordered by name", async () => {
    mocks.personFindMany.mockResolvedValue([
      {
        id: "p1",
        firstName: "Michael",
        lastName: "Duijster",
        displayName: null,
        email: "it@fcallschwil.ch",
      },
    ]);

    const rows = await browseDiscoverableTenantPersons("tenant-fca", 20, 0);
    expect(mocks.personFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-fca", isActive: true },
      }),
    );
    expect(rows[0]?.displayName).toBe("Michael Duijster");
  });

  it("search applies case-insensitive term filter", async () => {
    mocks.personFindMany.mockResolvedValue([]);
    await searchDiscoverableTenantPersons("tenant-fca", "duij", 10, 0);
    expect(mocks.personFindMany.mock.calls[0]?.[0]?.where?.OR).toBeDefined();
  });
});
