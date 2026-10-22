import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getEnabledFinanceCapabilities } from "@/lib/finance/services/finance-capability-service";
import { buildFinanceTabNavigationConfig } from "@/lib/finance/finance-tab-config";
import { resolveFinanceNavigation } from "@/lib/finance/navigation/finance-navigation";
import { isFinanceCapabilityImplemented } from "@/lib/finance/capability-registry";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("FIN-01D capability-aware Finance workspace navigation", () => {
  const budgetViewerCtx = {
    tenantId: "t1",
    userId: "u1",
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_BUDGET_VIEW,
    ]),
  };

  function budgetNavVisible(input: {
    enabled: ReadonlySet<string>;
    setupConfigured: boolean;
    ctx?: typeof budgetViewerCtx;
  }) {
    const items = resolveFinanceNavigation({
      ctx: input.ctx ?? budgetViewerCtx,
      enabledCapabilities: input.enabled as never,
      setupConfigured: input.setupConfigured,
    });
    return items.some((item) => item.key === "budget");
  }

  it("A: BUDGETING available but tenant capability OFF hides Budget nav", () => {
    expect(isFinanceCapabilityImplemented("BUDGETING")).toBe(true);
    expect(
      budgetNavVisible({
        enabled: new Set(["OVERVIEW"]),
        setupConfigured: true,
      }),
    ).toBe(false);
    const tabs = buildFinanceTabNavigationConfig({
      showStructure: true,
      showBudget: false,
      showSettings: true,
      labels: { overview: "O", structure: "S", budget: "B", settings: "E" },
    });
    expect(tabs.tabs.some((tab) => tab.key === "budget")).toBe(false);
  });

  it("B: tenant BUDGETING ON with authorized user exposes Budget nav", () => {
    expect(
      budgetNavVisible({
        enabled: new Set(["OVERVIEW", "BUDGETING"]),
        setupConfigured: true,
      }),
    ).toBe(true);
    const tabs = buildFinanceTabNavigationConfig({
      showStructure: true,
      showBudget: true,
      showSettings: true,
      labels: { overview: "O", structure: "S", budget: "B", settings: "E" },
    });
    expect(tabs.tabs.map((tab) => tab.key)).toEqual([
      "overview",
      "structure",
      "budget",
      "settings",
    ]);
    expect(tabs.tabRoutes.budget).toBe("/dashboard/finance/budget");
  });

  it("C: capability ON without finance year keeps Budget nav (setup incomplete)", () => {
    expect(
      budgetNavVisible({
        enabled: new Set(["OVERVIEW", "BUDGETING"]),
        setupConfigured: false,
      }),
    ).toBe(true);
  });

  it("D: capability ON with finance year but no accounts still shows Budget nav", () => {
    expect(
      budgetNavVisible({
        enabled: new Set(["OVERVIEW", "BUDGETING"]),
        setupConfigured: true,
      }),
    ).toBe(true);
  });

  it("E: capability ON with setup complete keeps budget route in workspace tabs", () => {
    const tabs = buildFinanceTabNavigationConfig({
      showStructure: true,
      showBudget: true,
      showSettings: true,
      labels: { overview: "O", structure: "S", budget: "B", settings: "E" },
    });
    expect(tabs.resolveActiveTabFromPathname("/dashboard/finance/budget", ["budget"])).toBe(
      "budget",
    );
  });

  it("F: capability ON without budget view permission hides Budget nav", () => {
    const manageOnly = {
      ...budgetViewerCtx,
      permissionKeys: new Set([PERMISSIONS.FINANCE_BUDGET_MANAGE]),
    };
    expect(
      budgetNavVisible({
        enabled: new Set(["OVERVIEW", "BUDGETING"]),
        setupConfigured: true,
        ctx: manageOnly,
      }),
    ).toBe(false);
  });

  it("G: finance pages wire context tabs to resolved budget visibility", () => {
    const overviewPage = readFinancePage("app/(admin)/dashboard/finance/page.tsx");
    expect(overviewPage).toContain("showBudget={workspace.showBudgetNav}");
    expect(overviewPage).toContain('budget: t("nav.budget")');
    const budgetPage = readFinancePage("app/(admin)/dashboard/finance/budget/page.tsx");
    expect(budgetPage).not.toContain("FinanceCapabilityNav");
    expect(budgetPage).not.toContain("!workspace.setupConfigured");
  });

  it("G: tenant capability persistence reloads enabled BUDGETING", async () => {
    const db = {
      financeTenantCapability: {
        findMany: async () => [
          { capability: "OVERVIEW", enabled: true },
          { capability: "BUDGETING", enabled: true },
        ],
      },
    };
    const enabled = await getEnabledFinanceCapabilities(db as never, "tenant-1");
    expect(enabled.has("BUDGETING")).toBe(true);
  });

  it("H: FIN-01B overview tab remains in finance workspace tabs", () => {
    const tabs = buildFinanceTabNavigationConfig({
      showStructure: false,
      showBudget: false,
      showSettings: false,
      labels: { overview: "O", structure: "S", budget: "B", settings: "E" },
    });
    expect(tabs.tabs[0]?.key).toBe("overview");
    expect(tabs.tabRoutes.overview).toBe("/dashboard/finance");
  });

  it("I: FIN-01C structure tab remains when structure permission is present", () => {
    const adminCtx = {
      tenantId: "t1",
      userId: "u1",
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
    expect(items.some((item) => item.key === "structure")).toBe(true);
  });

  it("J: sponsoring remains separate from finance workspace nav", () => {
    const navConfig = readFinancePage("lib/nav/nav-config.ts");
    expect(navConfig).not.toContain("Finanzen & Partnerschaften");
    expect(navConfig).toMatch(/\/dashboard\/finance/);
    expect(navConfig).toMatch(/sponsor/i);
  });
});

function readFinancePage(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}
