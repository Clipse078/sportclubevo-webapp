import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import deMessages from "@/messages/de.json";
import { formatFinanceYearPeriodLabel } from "@/lib/finance/setup/finance-year-period-display";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("FIN-02B R3 finance settings scope UX", () => {
  it("communicates tenant-wide Funktionen scope in canonical i18n", () => {
    const help = deMessages.Finance.settings.capabilitiesHelp as string;
    expect(help).toMatch(/unabhängig vom Finanzjahr/i);
    expect(deMessages.Finance.settings.financeYearHelp).toMatch(/Finanzperioden/i);
  });

  it("renders configured FinanceYear name and period with compact list + edit affordance", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("data-finance-year-list");
    expect(panel).toContain("data-finance-year-name");
    expect(panel).toContain("data-finance-year-period");
    expect(panel).toContain("data-finance-year-edit");
    expect(panel).toContain("formatFinanceYearPeriodLabel");
    expect(panel).not.toContain("FinanceYearSettingsRowForm");
  });

  it("does not keep add-year form permanently expanded", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("data-finance-year-create-trigger");
    expect(panel).toContain("FinanceYearCreateDialog");
    expect(panel).toContain("data-finance-year-create-form");
    expect(panel).not.toContain("addFinanceYearHeading");
    expect(panel).not.toMatch(
      /<form[\s\S]*addFinanceYear[\s\S]*<\/form>[\s\S]*data-finance-year-list/,
    );
  });

  it("opens canonical dialog for create and edit financial year", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("@/components/ui/Dialog");
    expect(panel).toContain("FinanceYearEditDialog");
    expect(panel).toContain("data-finance-year-edit-form");
    expect(panel).toContain("readOnly={!periodEditable}");
    expect(panel).toContain("settings.financeYearPeriodLocked");
  });

  it("marks capabilities section as tenant-wide in UX (not year-scoped)", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain('data-finance-surface="settings-years"');
    expect(panel).toContain('data-finance-surface="settings-capabilities"');
    expect(panel).toContain('data-finance-capabilities-tenant-scope="true"');
    expect(panel).not.toContain("SceToolbarSelect");
    expect(panel).not.toContain("selectedYearId");
    const capabilityService = read("lib/finance/services/finance-capability-service.ts");
    expect(capabilityService).toContain("financeTenantCapability");
    expect(capabilityService).not.toContain("financeYearId");
  });

  it("uses responsive compact rows instead of wide table layout", () => {
    const panel = read("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).toContain("sm:flex-row");
    expect(panel).not.toContain("<table");
  });

  it("formats finance year period for display locale", () => {
    expect(formatFinanceYearPeriodLabel("2026-01-01", "2026-12-31", "de-CH")).toBe(
      "01.01.2026 – 31.12.2026",
    );
  });
});

describe("FIN-02B R3 budget year selector layout", () => {
  it("uses canonical SceToolbarSelect without finance-specific clipping offsets", () => {
    const panel = read("components/admin/finance/FinanceBudgetWorkspacePanel.tsx");
    expect(panel).toContain("SceToolbarSelect");
    expect(panel).not.toMatch(/finance.*select.*py-|finance.*select.*h-\[/i);
  });

  it("applies shared toolbar select padding contract in globals.css", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.sce-toolbar-select[\s\S]*padding-block:/);
    expect(css).toMatch(/\.sce-toolbar-select[\s\S]*line-height:/);
    const select = read("components/ui/SceToolbarSelect.tsx");
    expect(select).toContain("leading-5");
    expect(select).toContain("h-9");
  });
});
