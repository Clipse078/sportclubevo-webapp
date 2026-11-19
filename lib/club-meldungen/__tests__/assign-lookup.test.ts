import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadClubMeldungAssignOptions } from "@/lib/club-meldungen/assign-lookup";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    orgUnit: {
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/roles/tenant-queries", () => ({
  getEligibleTenantMembers: vi.fn(),
}));

vi.mock("@/lib/permissions/services/effective-permission-resolver", () => ({
  createEffectivePermissionResolver: vi.fn(() => ({
    hasPermission: vi.fn().mockResolvedValue(false),
  })),
}));

import { PERMISSIONS } from "@/lib/permissions/permissions";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { getEligibleTenantMembers } from "@/lib/roles/tenant-queries";

describe("loadClubMeldungAssignOptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.orgUnit.findMany).mockReset();
    vi.mocked(prisma.person.findMany).mockReset();
    vi.mocked(prisma.person.findMany).mockResolvedValue([]);
    vi.mocked(getEligibleTenantMembers).mockReset();
    vi.mocked(createEffectivePermissionResolver).mockReturnValue({
      hasPermission: vi.fn().mockResolvedValue(false),
    } as never);
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
      { id: "user-1", firstName: "Alex", lastName: "Muster", canOperateCase: false },
    ]);
    expect(prisma.orgUnit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", status: { not: "ARCHIVED" } },
      }),
    );
  });

  it("marks canOperateCase from meldungen.handle only, not view_all", async () => {
    const hasPermission = vi.fn(
      async (params: { permission: string; userId: string }) =>
        params.permission === PERMISSIONS.MELDUNGEN_HANDLE && params.userId === "user-handle",
    );
    vi.mocked(createEffectivePermissionResolver).mockReturnValue({
      hasPermission,
    } as never);
    vi.mocked(prisma.orgUnit.findMany).mockResolvedValue([] as never);
    vi.mocked(getEligibleTenantMembers).mockResolvedValue([
      {
        userId: "user-handle",
        firstName: "H",
        lastName: "Handle",
        email: "h@x",
        roleIds: [],
      },
      {
        userId: "user-viewer",
        firstName: "V",
        lastName: "Viewer",
        email: "v@x",
        roleIds: [],
      },
    ]);

    const options = await loadClubMeldungAssignOptions("tenant-1");

    expect(options.members).toEqual([
      { id: "user-handle", firstName: "H", lastName: "Handle", canOperateCase: true },
      { id: "user-viewer", firstName: "V", lastName: "Viewer", canOperateCase: false },
    ]);
    expect(hasPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: PERMISSIONS.MELDUNGEN_HANDLE,
      }),
    );
  });

  it("prefers linked Person names over bootstrap User account labels", async () => {
    vi.mocked(prisma.orgUnit.findMany).mockResolvedValue([] as never);
    vi.mocked(getEligibleTenantMembers).mockResolvedValue([
      {
        userId: "user-club-admin",
        firstName: "FC Allschwil",
        lastName: "Club Admin",
        email: "admin@example.com",
        roleIds: [],
      },
    ]);
    vi.mocked(prisma.person.findMany).mockResolvedValue([
      {
        userId: "user-club-admin",
        firstName: "Michael",
        lastName: "Duijster",
      },
    ] as never);

    const options = await loadClubMeldungAssignOptions("tenant-1");

    expect(options.members).toEqual([
      {
        id: "user-club-admin",
        firstName: "Michael",
        lastName: "Duijster",
        canOperateCase: false,
      },
    ]);
  });
});