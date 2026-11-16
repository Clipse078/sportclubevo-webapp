import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TASKS_DELETE_PERMISSION_DEF } from "@/lib/permissions/tasks-delete-permission-reconciliation";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

describe("PKG-03 — tasks.delete permission foundation", () => {
  it("REG-01: TASKS_DELETE follows the <module>.delete convention", () => {
    expect(PERMISSIONS.TASKS_DELETE).toBe("tasks.delete");
    expect(PERMISSIONS.TASKS_DELETE).not.toBe(PERMISSIONS.TASKS_MANAGE);
    expect(TASKS_DELETE_PERMISSION_DEF.key).toBe("tasks.delete");
    expect(TASKS_DELETE_PERMISSION_DEF.grantableByAdmin).toBe(true);
  });

  it("REG-02: hasTenantDeletionAuthority rejects non-.delete keys", async () => {
    const resolver = createEffectivePermissionResolver({} as never);
    await expect(
      resolver.hasTenantDeletionAuthority({
        userId: "user-1",
        tenantId: "tenant-1",
        permission: PERMISSIONS.TASKS_MANAGE,
      }),
    ).rejects.toThrow(/reserved for/i);
  });
});