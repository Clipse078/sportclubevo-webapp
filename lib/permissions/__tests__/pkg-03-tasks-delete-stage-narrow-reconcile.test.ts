import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  reconcileTasksDeletePermissionForStagePoTenant,
  TASKS_DELETE_PERMISSION_DEF,
  TASKS_DELETE_STAGE_PO_TENANT_KEY,
} from "@/lib/permissions/tasks-delete-permission-reconciliation";

const permissionFindUnique = vi.fn();
const permissionUpsert = vi.fn();
const roleFindFirst = vi.fn();
const roleFindUnique = vi.fn();
const tenantFindUnique = vi.fn();
const rolePermissionFindFirst = vi.fn();
const rolePermissionCreate = vi.fn();

const prisma = {
  permission: {
    findUnique: (...args: unknown[]) => permissionFindUnique(...args),
    upsert: (...args: unknown[]) => permissionUpsert(...args),
  },
  role: {
    findFirst: (...args: unknown[]) => roleFindFirst(...args),
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

describe("PKG-03 — STAGE narrow tasks.delete reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionFindUnique.mockResolvedValue(null);
    roleFindFirst.mockImplementation(({ where }: { where: { key: string } }) => {
      if (where.key === "super_admin" || where.key === "club_admin__fc-allschwil") {
        return Promise.resolve({ id: `role-${where.key}` });
      }
      return Promise.resolve(null);
    });
    rolePermissionFindFirst.mockResolvedValue(null);
    tenantFindUnique.mockResolvedValue({ id: "tenant-fca", key: TASKS_DELETE_STAGE_PO_TENANT_KEY });
    roleFindUnique.mockResolvedValue(null);
  });

  it("proposes only super_admin and designated tenant Club Admin (dry-run)", async () => {
    const result = await reconcileTasksDeletePermissionForStagePoTenant(prisma, {
      dryRun: true,
      databaseFingerprint: "acd3b37682911890",
    });

    expect(result.intendedTenantKey).toBe(TASKS_DELETE_STAGE_PO_TENANT_KEY);
    expect(result.permission.action).toBe("created");
    expect(result.permissionRowPreview).toEqual(TASKS_DELETE_PERMISSION_DEF);
    expect(permissionUpsert).not.toHaveBeenCalled();
    expect(rolePermissionCreate).not.toHaveBeenCalled();
    expect(result.roleGrants.map((g) => g.roleKey)).toEqual([
      "super_admin",
      "club_admin__fc-allschwil",
    ]);
  });
});