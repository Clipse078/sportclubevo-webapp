import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);

describe("FIN-03A FinanceActualsWorkspacePanel UX contract", () => {
  it("uses modal dialog for actual capture and segmented comparison mode", () => {
    expect(panel).toContain("createDialogTitle");
    expect(panel).toContain("SceSegmentedControl");
    expect(panel).toContain("modeYtd");
    expect(panel).toContain("ytdBudgetVarianceUnsupported");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("surfaces income vs expense semantics for accounts", () => {
    expect(panel).toContain("structure.semantics");
    expect(panel).toContain("income.label");
    expect(panel).toContain("expense.label");
  });
});
