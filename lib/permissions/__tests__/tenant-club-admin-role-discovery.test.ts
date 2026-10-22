import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { listTenantClubAdminRoleKeysForReconciliation } from "@/lib/permissions/tenant-club-admin-role-discovery";

describe("listTenantClubAdminRoleKeysForReconciliation", () => {
  it("includes canonical club_admin__* and tenant-scoped Club Admin aliases", async () => {
    const roleFindMany = vi.fn(async (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      if ("key" in where && (where as { key?: { startsWith?: string } }).key?.startsWith === "club_admin__") {
        return [{ key: "club_admin__fc-allschwil" }];
      }
      if ((where as { tenantId?: string }).tenantId === "tenant-1") {
        return [
          { key: "club_admin__fc-allschwil" },
          { key: "club_admin_fc_allschwil" },
          { key: "trainer_custom" },
        ];
      }
      return [];
    });

    const prisma = {
      role: { findMany: roleFindMany },
      tenant: { findMany: vi.fn().mockResolvedValue([{ id: "tenant-1", key: "fc-allschwil" }]) },
    } as unknown as PrismaClient;

    const keys = await listTenantClubAdminRoleKeysForReconciliation(prisma);

    expect(keys).toEqual(["club_admin__fc-allschwil", "club_admin_fc_allschwil"]);
    expect(keys).not.toContain("trainer_custom");
  });
});
