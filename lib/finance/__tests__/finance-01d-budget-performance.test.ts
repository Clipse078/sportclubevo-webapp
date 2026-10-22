import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceBudgetWorkspacePanel.tsx"),
  "utf8",
);
const actions = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/budget/actions.ts"),
  "utf8",
);

describe("FIN-01D budget editing performance contract", () => {
  it("keeps keystrokes local-first without router refresh per line save", () => {
    expect(panel).toContain("onLocalDraftChange");
    expect(panel).toContain("onPersist");
    expect(panel).not.toMatch(/onChange=\{[^}]*saveBudgetLineAction/s);
    expect(panel).not.toMatch(/onChange=\{[^}]*router\.refresh/s);
    const saveCalls = panel.match(/saveBudgetLineAction/g) ?? [];
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
    expect(panel).toContain("flushPendingLineSaves");
    expect(panel).not.toMatch(/disabled=\{workspacePending\}[\s\S]{0,120}type="text"/);
  });

  it("derives totals from local draft state", () => {
    expect(panel).toContain("budgetTotalsFromDraft");
    expect(panel).toContain("formatBudgetPlanningMinor");
    expect(panel).not.toContain("toFixed(2)");
  });

  it("uses financial year placeholder instead of implicit first year", () => {
    expect(panel).toContain("yearPlaceholder");
    expect(panel).toContain('value={selectedYearId ?? ""}');
    const budgetPage = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/budget/page.tsx"),
      "utf8",
    );
    expect(budgetPage).toContain("selectedYearId={selectedYearId}");
    expect(budgetPage).toContain("baseCurrency={baseCurrency}");
    expect(budgetPage).not.toContain("years[0]");
  });

  it("still revalidates budget route only at server action boundary", () => {
    expect(actions).toContain('revalidatePath("/dashboard/finance/budget")');
  });
});
