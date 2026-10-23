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
    expect(panel).toContain("FINANCE_CURRENCY_CONTEXT_CLASS");
    expect(panel).toContain("SceToolbarSelect");
  });

  it("uses shared dark finance surface primitives", () => {
    expect(panel).toContain("FINANCE_SECTION_SURFACE_CLASS");
    expect(panel).toContain("FINANCE_SUMMARY_SURFACE_CLASS");
    expect(panel).toContain("data-budget-summary=\"result\"");
  });

  it("FIN-02A surfaces readiness, baseline, and revision without checkboxes", () => {
    expect(panel).toContain("readinessTitle");
    expect(panel).toContain("governanceBaselineTitle");
    expect(panel).toContain("rebaselineDialogTitle");
    expect(panel).toContain("currentBaselineBadge");
    expect(panel).toContain("startWorkingRevisionAction");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("FIN-02A R2 surfaces calm workspace persistence feedback without per-line toasts", () => {
    expect(panel).toContain("deriveBudgetWorkspacePersistencePhase");
    expect(panel).toContain("Finance.budget.persistence");
    expect(panel).toContain("data-budget-persistence");
    expect(panel).toContain("onPersistencePhaseChange");
    expect(panel).not.toMatch(/toast/i);
  });

  it("FIN-02A R2 labels working-revision totals separately from governance baseline", () => {
    expect(panel).toContain("workingRevisionTotalsScope");
    expect(panel).toContain("data-budget-editable-scope");
    expect(panel).toContain('"working-revision"');
  });

  it("FIN-02C uses create dialog with segmented choice (no checkboxes)", () => {
    expect(panel).toContain("createAnnualBudgetAction");
    expect(panel).toContain("createDialogTitle");
    expect(panel).toContain("SceSegmentedControl");
    expect(panel).toContain("createModeEmpty");
    expect(panel).toContain("createModeCopy");
    expect(panel).not.toContain('type="checkbox"');
  });
});
