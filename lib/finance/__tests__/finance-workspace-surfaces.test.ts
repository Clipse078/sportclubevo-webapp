import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FINANCE_BUDGET_AMOUNT_INPUT_CLASS,
  FINANCE_CONTEXT_STRIP_CLASS,
  FINANCE_SECTION_SURFACE_CLASS,
  FINANCE_WORKSPACE_STACK_CLASS,
} from "@/lib/finance/finance-workspace-surfaces";

describe("FIN-01D R5 finance workspace surfaces", () => {
  it("uses canonical SCE surface tokens for functional layers", () => {
    expect(FINANCE_SECTION_SURFACE_CLASS).toContain("--sce-surface-standard");
    expect(FINANCE_CONTEXT_STRIP_CLASS).toContain("--sce-surface-dense");
    expect(FINANCE_BUDGET_AMOUNT_INPUT_CLASS).toContain("fca-input");
  });

  it("keeps budget workspace on shared finance surface primitives", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceBudgetWorkspacePanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("FINANCE_WORKSPACE_STACK_CLASS");
    expect(panel).toContain("FINANCE_CONTEXT_STRIP_CLASS");
    expect(panel).toContain("FINANCE_SECTION_SURFACE_CLASS");
    expect(panel).toContain("FINANCE_BUDGET_AMOUNT_INPUT_CLASS");
    expect(panel).toContain("FINANCE_SUMMARY_SURFACE_CLASS");
  });

  it("aligns finance pages to shared stack width contract", () => {
    for (const relative of [
      "components/admin/finance/FinanceOverviewPanel.tsx",
      "components/admin/finance/FinanceSettingsPanel.tsx",
      "components/admin/finance/FinanceStructureBuilderPanel.tsx",
    ]) {
      const src = readFileSync(join(process.cwd(), relative), "utf8");
      expect(src, relative).toContain("FINANCE_WORKSPACE_STACK_CLASS");
    }
  });
});
