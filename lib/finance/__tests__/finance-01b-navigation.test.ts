import { describe, expect, it } from "vitest";
import { resolveFinanceNavigation } from "@/lib/finance/navigation/finance-navigation";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("FIN-01B capability-driven navigation", () => {
  const viewerCtx = {
    tenantId: "t1",
    userId: "u1",
    permissionKeys: new Set([PERMISSIONS.FINANCE_VIEW]),
  };

  it("shows overview and setup entry before configuration", () => {
    const items = resolveFinanceNavigation({
      ctx: viewerCtx,
      enabledCapabilities: new Set(),
      setupConfigured: false,
    });
    expect(items.map((i) => i.key)).toEqual(["overview"]);
  });

  it("exposes budget when BUDGETING capability is implemented and enabled", () => {
    const budgetViewerCtx = {
      ...viewerCtx,
      permissionKeys: new Set([
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.FINANCE_BUDGET_VIEW,
      ]),
    };
    const items = resolveFinanceNavigation({
      ctx: budgetViewerCtx,
      enabledCapabilities: new Set(["OVERVIEW", "BUDGETING"]),
      setupConfigured: true,
    });
    expect(items.some((i) => i.key === "budget")).toBe(true);
  });

  it("includes structure settings only with structure permission", () => {
    const adminCtx = {
      ...viewerCtx,
      permissionKeys: new Set([
        PERMISSIONS.FINANCE_VIEW,
        PERMISSIONS.FINANCE_STRUCTURE_MANAGE,
      ]),
    };
    const items = resolveFinanceNavigation({
      ctx: adminCtx,
      enabledCapabilities: new Set(["OVERVIEW"]),
      setupConfigured: true,
    });
    expect(items.some((i) => i.key === "structure")).toBe(true);
  });
});
