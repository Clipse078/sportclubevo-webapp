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
  });

  it("labels planned amount inputs for accessibility", () => {
    expect(panel).toContain("aria-label");
    expect(panel).toContain("plannedAmountLabel");
  });
});
