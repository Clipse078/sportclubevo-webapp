import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_SECTIONS } from "@/lib/nav/nav-config";
import { FINANCE_WORKSPACE_ROUTE_V1 } from "@/lib/finance/finance-architecture";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  filterTenantClubAdminDelegatablePermissionKeys,
  TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS,
} from "@/lib/permissions/tenant-club-admin-permission-contract";
import { resolveFinanceOverviewState } from "@/lib/finance/setup/finance-setup-state";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("FIN-01B-R1 UAT routing and navigation", () => {
  it("AUTHORIZED_ROUTE_REGRESSION: finance workspace gates on finance.view only", () => {
    const ctxSource = read("lib/finance/server/finance-page-context.ts");
    expect(ctxSource).toContain("requireAnyPermission([PERMISSIONS.FINANCE_VIEW])");
    expect(ctxSource).not.toContain('redirect("/dashboard")');
  });

  it("NOT_CONFIGURED_ROUTE_REGRESSION: overview resolves setup UI states without fake balances", () => {
    expect(
      resolveFinanceOverviewState({
        configuration: null,
        financeYearCount: 0,
        enabledCapabilityCount: 0,
      }),
    ).toBe("NOT_CONFIGURED");

    const panelSource = read("components/admin/finance/FinanceOverviewPanel.tsx");
    expect(panelSource).toContain("data-finance-overview-state");
    expect(panelSource).not.toMatch(/CHF|42000|Demo/);
  });

  it("NAVIGATION_REGRESSION: club Finanzen targets canonical finance route", () => {
    const finanzen = NAV_SECTIONS.flatMap((section) => section.items).find(
      (item) => item.key === "finanzen",
    );
    expect(finanzen).toEqual(
      expect.objectContaining({
        label: "Finanzen",
        href: "/dashboard/finance",
        permissionKeys: [PERMISSIONS.FINANCE_VIEW],
      }),
    );
    expect(finanzen?.label).not.toContain("Partnerschaften");
  });

  it("NAVIGATION_REGRESSION: IA explorer separates Finanzen from Sponsoring", () => {
    const matrixSource = read("lib/nav/nav-ia-v2/target-ia-matrix.ts");
    expect(matrixSource).toContain('label: "Finanzen"');
    expect(matrixSource).not.toContain("Finanzen & Partnerschaften");
    expect(matrixSource).toContain('keys: ["finanzen"]');
    expect(matrixSource).toContain('keys: ["sponsoring"]');
  });

  it("LEGACY_ROUTE_REGRESSION: vereinsleitung finanzen redirects to canonical workspace", () => {
    expect(read("app/(admin)/vereinsleitung/finanzen/layout.tsx")).toContain(
      "redirect(FINANCE_WORKSPACE_ROUTE_V1)",
    );
    expect(read("app/(admin)/vereinsleitung/finanzen/page.tsx")).toContain(
      'redirect(FINANCE_WORKSPACE_ROUTE_V1)',
    );
    expect(FINANCE_WORKSPACE_ROUTE_V1).toBe("/dashboard/finance");
  });

  it("Club Admin catalog contract includes organisation finance permissions", () => {
    const keys = filterTenantClubAdminDelegatablePermissionKeys([
      { key: "finance.view", scope: "TENANT", grantableByAdmin: true },
      { key: "finance.structure.manage", scope: "TENANT", grantableByAdmin: true },
      { key: "finance.admin", scope: "TENANT", grantableByAdmin: true },
    ]);
    expect(keys).toEqual(["finance.admin", "finance.structure.manage", "finance.view"]);
    for (const key of [
      "finance.view",
      "finance.structure.manage",
      "finance.admin",
    ] as const) {
      expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(key);
    }
  });

  it("FINANCE_DEMO_PRIMARY_ROUTE: legacy demo page no longer renders budget KPIs", () => {
    const legacyPage = read("app/(admin)/vereinsleitung/finanzen/page.tsx");
    expect(legacyPage).not.toContain("BUDGET_CATEGORIES");
    expect(legacyPage).not.toContain("DashboardKpiCard");
  });
});
