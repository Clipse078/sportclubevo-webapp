import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  canDistributeFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileFinanceReportingDistributePermissionsForClubAdmin } from "@/lib/permissions/finance-permission-reconciliation";

const listClubAdminRoles = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/tenant-club-admin-role-discovery", () => ({
  listTenantClubAdminRoleKeysForReconciliation: listClubAdminRoles,
}));

function ctx(permissionKeys: string[]): FinanceAuthContext {
  return {
    tenantId: "tenant-1",
    userId: "user-1",
    permissionKeys: new Set(permissionKeys),
  };
}

/** Simulates FIN-06D-upgraded Club Admin: publication keys without FIN-06E distribute. */
const fin06dPublicationKeys = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
];

describe("FIN-06E-R1 existing-tenant distribute permission upgrade", () => {
  it("reproduces PO UAT gap: share visible capability without distribute", () => {
    const auth = ctx(fin06dPublicationKeys);
    expect(canViewFinancePublicationHistory(auth)).toBe(true);
    expect(canShareFinancialReports(auth)).toBe(true);
    expect(canDistributeFinancialReports(auth)).toBe(false);
  });

  it("after distribute reconciliation, canonical reporting loader flags match UI", () => {
    const upgraded = ctx([...fin06dPublicationKeys, PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE]);
    const canViewPublications = canViewFinancePublicationHistory(upgraded);
    const canDistributePublication =
      canDistributeFinancialReports(upgraded) && canViewPublications;
    expect(canDistributePublication).toBe(true);
  });

  it("assigns distribute to legacy Club Admin role rows idempotently", async () => {
    listClubAdminRoles.mockResolvedValue(["club_admin__existing"]);
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (where.key === PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE) {
        return { id: "perm-distribute" };
      }
      return null;
    });
    const permissionCreate = vi.fn(async () => ({}));
    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === "club_admin__existing" ? { id: "role-existing" } : null,
    );
    let assigned = false;
    const rolePermissionFindUnique = vi.fn(async () =>
      assigned ? { roleId: "role-existing" } : null,
    );
    const rolePermissionUpsert = vi.fn(async () => ({}));

    const prisma = {
      permission: { findUnique: permissionFindUnique, create: permissionCreate },
      role: { findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    const first = await reconcileFinanceReportingDistributePermissionsForClubAdmin(prisma, false);
    assigned = true;
    const second = await reconcileFinanceReportingDistributePermissionsForClubAdmin(prisma, false);

    expect(first[0]?.action).toBe("assigned");
    expect(second[0]?.action).toBe("already_assigned");
    expect(rolePermissionUpsert).toHaveBeenCalledTimes(2);
  });
});
