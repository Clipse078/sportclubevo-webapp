import { describe, expect, it } from "vitest";
import { evaluateBudgetApprovalReadiness } from "@/lib/finance/budget/budget-approval-readiness";

describe("FIN-02A budget approval readiness", () => {
  it("allows approval when currency and at least one line exist", () => {
    const result = evaluateBudgetApprovalReadiness({
      versionStatus: "DRAFT",
      baseCurrency: "CHF",
      lines: [
        {
          amountMinor: 0,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      siblingApprovedExists: false,
    });
    expect(result.canApprove).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("treats zero amounts as valid planned lines", () => {
    const result = evaluateBudgetApprovalReadiness({
      versionStatus: "DRAFT",
      baseCurrency: "EUR",
      lines: [
        {
          amountMinor: 0,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "INCOME" },
        },
      ],
      siblingApprovedExists: false,
    });
    expect(result.canApprove).toBe(true);
  });

  it("blocks when base currency is missing", () => {
    const result = evaluateBudgetApprovalReadiness({
      versionStatus: "DRAFT",
      baseCurrency: null,
      lines: [
        {
          amountMinor: 100,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      siblingApprovedExists: false,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "BASE_CURRENCY_REQUIRED")).toBe(true);
  });

  it("blocks when no planned lines exist", () => {
    const result = evaluateBudgetApprovalReadiness({
      versionStatus: "DRAFT",
      baseCurrency: "USD",
      lines: [],
      siblingApprovedExists: false,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "NO_PLANNED_LINES")).toBe(true);
  });

  it("warns but does not block archived account lines", () => {
    const result = evaluateBudgetApprovalReadiness({
      versionStatus: "DRAFT",
      baseCurrency: "GBP",
      lines: [
        {
          amountMinor: 500,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ARCHIVED", canonicalSemantic: "EXPENSE" },
        },
      ],
      siblingApprovedExists: false,
    });
    expect(result.canApprove).toBe(true);
    expect(result.issues.some((i) => i.code === "LINE_ON_ARCHIVED_ACCOUNT")).toBe(true);
  });
});
