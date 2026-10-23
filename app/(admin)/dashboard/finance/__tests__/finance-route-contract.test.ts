import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("FIN-01B finance routes", () => {
  it("declares canonical /dashboard/finance workspace", () => {
    expect(read("app/(admin)/dashboard/finance/page.tsx")).toContain("FINANCE_WORKSPACE_ROUTE_V1");
    expect(read("lib/finance/finance-architecture.ts")).toContain('"/dashboard/finance"');
  });

  it("registers finance in canonical nav config", () => {
    expect(read("lib/nav/nav-config.ts")).toContain('href: "/dashboard/finance"');
    expect(read("lib/nav/nav-config.ts")).toContain("PERMISSIONS.FINANCE_VIEW");
  });

  it("declares FIN-03A actuals workspace route", () => {
    expect(read("app/(admin)/dashboard/finance/actuals/page.tsx")).toContain(
      "FinanceActualsWorkspacePanel",
    );
    expect(read("lib/finance/capability-registry.ts")).toContain("/dashboard/finance/actuals");
    const panel = read("components/admin/finance/FinanceActualsWorkspacePanel.tsx");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("declares FIN-01D budget workspace route", () => {
    expect(read("app/(admin)/dashboard/finance/budget/page.tsx")).toContain(
      "FinanceBudgetWorkspacePanel",
    );
    expect(read("app/(admin)/dashboard/finance/budget/page.tsx")).toContain(
      "showBudget={workspace.showBudgetNav}",
    );
    expect(read("app/(admin)/dashboard/finance/budget/page.tsx")).not.toContain(
      "FinanceCapabilityNav",
    );
    const panel = read("components/admin/finance/FinanceBudgetWorkspacePanel.tsx");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("declares FIN-01C financial structure builder route", () => {
    expect(read("app/(admin)/dashboard/finance/structure/page.tsx")).toContain(
      "FinanceStructureBuilderPanel",
    );
    expect(read("lib/finance/capability-registry.ts")).toContain("/dashboard/finance/structure");
  });

  it("uses canonical switch toggles for capability settings (binary control compliance)", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("@/components/ui/SwitchToggle");
    expect(panel).toMatch(/SwitchToggle|SwitchThumb/);
    expect(panel).not.toContain('type="checkbox"');
  });

  it("uses searchable ISO 4217 base currency selector (FIN-01E R3)", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("FinanceBaseCurrencySelector");
    expect(panel).not.toMatch(/name="baseCurrency"/);
  });

  it("formats Finance overview amounts with tenant formatting locale (FIN-01E R5)", () => {
    const overviewPage = read("app/(admin)/dashboard/finance/page.tsx");
    expect(overviewPage).toContain("formattingLocale");
    expect(overviewPage).not.toContain("getLocale");

    const budgetPage = read("app/(admin)/dashboard/finance/budget/page.tsx");
    expect(budgetPage).toContain("formattingLocale={workspace.formattingLocale}");

    const panel = read("components/admin/finance/FinanceBudgetWorkspacePanel.tsx");
    expect(panel).toContain("formattingLocale:");
    expect(panel).not.toContain("useLocale");
  });
});
