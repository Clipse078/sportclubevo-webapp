import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceBudgetWorkspacePanel.tsx"),
  "utf8",
);

describe("FIN-01D budget workspace UX", () => {
  it("uses prerequisite nudges without checkboxes", () => {
    expect(panel).toContain("noYearTitle");
    expect(panel).toContain("noAccountsTitle");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("uses approval confirmation dialog rather than toggle", () => {
    expect(panel).toContain("approveDialogTitle");
    expect(panel).toContain("approveBudgetAction");
    expect(panel).toContain("approveBlockedPendingSave");
  });

  it("labels planned amount inputs for accessibility", () => {
    expect(panel).toContain("aria-label");
    expect(panel).toContain("plannedAmountLabel");
  });

  it("separates local draft updates from blur persistence", () => {
    expect(panel).toContain("onLocalDraftChange");
    expect(panel).toContain("onPersist");
    expect(panel).toContain("normalizeBudgetAmountInput");
  });

  it("requires a selected financial year before showing budget workspace", () => {
    expect(panel).toContain("selectYearHint");
    expect(panel).toContain("yearSelected");
  });

  it("surfaces tenant base currency context beside the financial year", () => {
    expect(panel).toContain("currencyLabel");
    expect(panel).toContain("data-budget-currency");
    expect(panel).toContain("baseCurrency");
    expect(panel).toContain("formatBudgetPlanningWholeMajorNumber");
    expect(panel).toContain("formatBudgetPlanningMinor");
  });
});
