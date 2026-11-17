/**
 * Unit coverage for delegation call shape (no live DB).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  tenantMembershipFindUnique: vi.fn(),
  roleFindMany: vi.fn(),
  userRoleFindMany: vi.fn(),
  userRoleDelete: vi.fn(),
  userRoleCreate: vi.fn(),
  tenantFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

const delegationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: { findUnique: prismaMocks.tenantMembershipFindUnique },
    role: { findMany: prismaMocks.roleFindMany },
    userRole: {
      findMany: prismaMocks.userRoleFindMany,
      delete: prismaMocks.userRoleDelete,
      create: prismaMocks.userRoleCreate,
    },
    tenant: { findUnique: prismaMocks.tenantFindUnique },
    $transaction: prismaMocks.transaction,
  },
}));

vi.mock("@/lib/roles/delegation", () => ({
  assertTenantDelegationAllowed: delegationMock,
}));

vi.mock("@/lib/audit/log-action", () => ({ logAction: vi.fn() }));

import { setTenantUserRoles } from "@/lib/roles/mutations";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMocks.tenantMembershipFindUnique.mockResolvedValue({ isActive: true });
  prismaMocks.roleFindMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) =>
      where.id.in.map((id) => ({
        id,
        name: id === "role-new" ? "Vorstandsmitglied" : "Existing",
        isSystem: false,
        isArchived: false,
      })),
  );
  prismaMocks.userRoleFindMany.mockResolvedValue([
    {
      id: "ur-1",
      roleId: "role-existing",
      role: { id: "role-existing", key: "existing", name: "Existing" },
    },
  ]);
  prismaMocks.tenantFindUnique.mockResolvedValue({ key: "tenant-key" });
  prismaMocks.userRoleDelete.mockResolvedValue({});
  prismaMocks.userRoleCreate.mockResolvedValue({});
  prismaMocks.transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  delegationMock.mockResolvedValue(undefined);
});

describe("setTenantUserRoles — delegation unit", () => {
  it("calls assertTenantDelegationAllowed only for newly added role ids", async () => {
    await setTenantUserRoles({
      tenantId: "tenant-a",
      userId: "user-target",
      roleIds: ["role-existing", "role-new"],
      actorUserId: "actor-a",
    });

    expect(delegationMock).toHaveBeenCalledTimes(1);
    expect(delegationMock).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      actorUserId: "actor-a",
      roleIds: ["role-new"],
    });
  });

  it("skips delegation when the selection matches existing assignments", async () => {
    await setTenantUserRoles({
      tenantId: "tenant-a",
      userId: "user-target",
      roleIds: ["role-existing"],
      actorUserId: "actor-a",
    });

    expect(delegationMock).not.toHaveBeenCalled();
    expect(prismaMocks.transaction).not.toHaveBeenCalled();
  });

  it("delegates each batch of newly added roles in one assertTenantDelegationAllowed call", async () => {
    prismaMocks.roleFindMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({
          id,
          name: id,
          isSystem: false,
          isArchived: false,
        })),
    );

    await setTenantUserRoles({
      tenantId: "tenant-a",
      userId: "user-target",
      roleIds: ["role-existing", "role-new-a", "role-new-b"],
      actorUserId: "actor-a",
    });

    expect(delegationMock).toHaveBeenCalledTimes(1);
    expect(delegationMock).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      actorUserId: "actor-a",
      roleIds: ["role-new-a", "role-new-b"],
    });
  });

  it("does not re-delegate when only removing roles (removal authority is route-level)", async () => {
    await setTenantUserRoles({
      tenantId: "tenant-a",
      userId: "user-target",
      roleIds: [],
      actorUserId: "actor-a",
    });

    expect(delegationMock).not.toHaveBeenCalled();
    expect(prismaMocks.transaction).toHaveBeenCalled();
  });
});