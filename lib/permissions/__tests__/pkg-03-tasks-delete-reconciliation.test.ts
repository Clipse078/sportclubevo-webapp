import { beforeEach, describe, expect, it, vi } from "vitest";
import { reconcileTasksDeletePermission } from "@/lib/permissions/tasks-delete-permission-reconciliation";

const permissionFindUnique = vi.fn();
const permissionCreate = vi.fn();
const roleFindFirst = vi.fn();
const roleFindMany = vi.fn();
const roleFindUnique = vi.fn();
const tenantFindUnique = vi.fn();
const rolePermissionFindFirst = vi.fn();
const rolePermissionCreate = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: class PrismaClient {},
}));

const prisma = {
  permission: {
    findUnique: (...args: unknown[]) => permissionFindUnique(...args),
    create: (...args: unknown[]) => permissionCreate(...args),
  },
  role: {
    findFirst: (...args: unknown[]) => roleFindFirst(...args),
    findMany: (...args: unknown[]) => roleFindMany(...args),
    findUnique: (...args: unknown[]) => roleFindUnique(...args),
  },
  tenant: {
    findUnique: (...args: unknown[]) => tenantFindUnique(...args),
  },
  rolePermission: {
    findFirst: (...args: unknown[]) => rolePermissionFindFirst(...args),
    create: (...args: unknown[]) => rolePermissionCreate(...args),
  },
} as never;

describe("PKG-03 — tasks.delete reconciliation (dry-run default)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionFindUnique.mockResolvedValue(null);
    roleFindFirst.mockResolvedValue({ id: "role-1" });
    roleFindMany.mockResolvedValue([]);
    roleFindUnique.mockResolvedValue(null);
    tenantFindUnique.mockResolvedValue(null);
    rolePermissionFindFirst.mockResolvedValue(null);
  });

  it("does not write permission rows when dryRun=true (default)", async () => {
    const result = await reconcileTasksDeletePermission(prisma);
    expect(result.permission.action).toBe("created");
    expect(permissionCreate).not.toHaveBeenCalled();
    expect(rolePermissionCreate).not.toHaveBeenCalled();
  });
});