import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = {
  role: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

describe("ensureTenantScopedRoleByKeyOrName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconciles PLATFORM-scoped tenant roles to TENANT", async () => {
    prismaMock.role.findFirst.mockResolvedValue({
      id: "role-1",
      scope: "PLATFORM",
      tenantId: "tenant-a",
    });
    prismaMock.role.update.mockResolvedValue({});

    const { ensureTenantScopedRoleByKeyOrName } = await import(
      "@/lib/roles/ensure-tenant-scoped-synced-role"
    );

    const result = await ensureTenantScopedRoleByKeyOrName("tenant-a", {
      key: "pilot_vereinsleitung_mitglied",
    });

    expect(result).toEqual({
      status: "reconciled",
      roleId: "role-1",
      previousScope: "PLATFORM",
    });
    expect(prismaMock.role.update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: { scope: "TENANT", tenantId: "tenant-a" },
    });
  });
});