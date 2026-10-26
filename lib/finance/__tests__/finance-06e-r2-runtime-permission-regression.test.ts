/**
 * FIN-06E-R2 — failure-boundary regression: FIN-06D role state → distribute grant → Versenden gate.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  canDistributeFinancialReports,
  canShareFinancialReports,
  canViewFinancePublicationHistory,
} from "@/lib/finance/publishing/finance-publishing-authorization";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { reconcileFinanceReportingDistributePermissionsForClubAdmin } from "@/lib/permissions/finance-permission-reconciliation";

const listClubAdminRoles = vi.hoisted(() => vi.fn());

vi.mock("@/lib/permissions/tenant-club-admin-role-discovery", () => ({
  listTenantClubAdminRoleKeysForReconciliation: listClubAdminRoles,
}));

/** Mirrors `app/(admin)/dashboard/finance/reports/page.tsx` publication capability wiring. */
function resolveReportsPageCanDistributePublication(ctx: FinanceAuthContext): boolean {
  const canViewPublications = canViewFinancePublicationHistory(ctx);
  return canDistributeFinancialReports(ctx) && canViewPublications;
}

const fin06dClubAdminKeys = [
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_PUBLICATION_VIEW,
  PERMISSIONS.FINANCE_REPORTING_SHARE,
  PERMISSIONS.FINANCE_REPORTING_PUBLISH,
  PERMISSIONS.FINANCE_SHARE_MANAGE,
];

function ctx(permissionKeys: string[]): FinanceAuthContext {
  return {
    tenantId: "tenant-fc-allschwil",
    userId: "user-club-admin",
    permissionKeys: new Set(permissionKeys),
  };
}

describe("FIN-06E-R2 runtime permission regression", () => {
  it("truth table: missing catalog grant keeps Versenden hidden on reports page", () => {
    const auth = ctx(fin06dClubAdminKeys);
    expect(canViewFinancePublicationHistory(auth)).toBe(true);
    expect(canShareFinancialReports(auth)).toBe(true);
    expect(canDistributeFinancialReports(auth)).toBe(false);
    expect(resolveReportsPageCanDistributePublication(auth)).toBe(false);
  });

  it("after FIN-06E-R1 reconciliation path, reports page exposes Versenden", async () => {
    listClubAdminRoles.mockResolvedValue(["club_admin__fc-allschwil"]);
    const permissionFindUnique = vi.fn(async ({ where }: { where: { key: string } }) => {
      if (where.key === PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE) {
        return { id: "perm-distribute" };
      }
      return null;
    });
    const permissionCreate = vi.fn(async () => ({}));
    const roleFindUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === "club_admin__fc-allschwil" ? { id: "role-fca-ca" } : null,
    );
    let hasGrant = false;
    const rolePermissionFindUnique = vi.fn(async () => (hasGrant ? { id: "rp-1" } : null));
    const rolePermissionUpsert = vi.fn(async () => {
      hasGrant = true;
    });

    const prisma = {
      permission: { findUnique: permissionFindUnique, create: permissionCreate },
      role: { findUnique: roleFindUnique },
      rolePermission: {
        findUnique: rolePermissionFindUnique,
        upsert: rolePermissionUpsert,
      },
    } as unknown as PrismaClient;

    const before = ctx(fin06dClubAdminKeys);
    expect(resolveReportsPageCanDistributePublication(before)).toBe(false);

    const outcomes = await reconcileFinanceReportingDistributePermissionsForClubAdmin(
      prisma,
      false,
    );
    expect(outcomes[0]?.action).toBe("assigned");

    const after = ctx([...fin06dClubAdminKeys, PERMISSIONS.FINANCE_REPORTING_DISTRIBUTE]);
    expect(canDistributeFinancialReports(after)).toBe(true);
    expect(resolveReportsPageCanDistributePublication(after)).toBe(true);
  });

  it("documents that finance SSR uses live request effective permissions (not JWT-only gating)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/server/finance-page-context.ts"),
      "utf8",
    );
    expect(source).toContain("getRequestEffectivePermissions");
    expect(source).not.toContain("session.user!.permissionKeys");
  });
});
