import { describe, expect, it } from "vitest";
import { evaluateBudgetApprovalReadiness } from "@/lib/finance/budget/budget-approval-readiness";

describe("FIN-02A/02B budget approval readiness", () => {
  it("allows first approval when currency and at least one line exist", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: "CHF",
      lines: [
        {
          amountMinor: 0,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("treats zero amounts as valid planned lines", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: "EUR",
      lines: [
        {
          amountMinor: 0,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "INCOME" },
        },
      ],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(true);
  });

  it("blocks first approval when base currency is missing", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: null,
      lines: [
        {
          amountMinor: 100,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "BASE_CURRENCY_REQUIRED")).toBe(true);
  });

  it("blocks when no planned lines exist", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: "USD",
      lines: [],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "NO_PLANNED_LINES")).toBe(true);
  });

  it("warns but does not block archived account lines", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: "GBP",
      lines: [
        {
          amountMinor: 500,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ARCHIVED", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(true);
    expect(result.issues.some((i) => i.code === "LINE_ON_ARCHIVED_ACCOUNT")).toBe(true);
  });

  it("blocks first approval when a current baseline already exists", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "FIRST_APPROVAL",
      versionStatus: "DRAFT",
      baseCurrency: "CHF",
      lines: [
        {
          amountMinor: 100,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: true,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "APPROVED_BASELINE_ALREADY_EXISTS")).toBe(true);
  });

  it("allows re-baseline readiness when a current baseline exists", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "REBASELINE",
      versionStatus: "DRAFT",
      baseCurrency: "CHF",
      lines: [
        {
          amountMinor: 200_00,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: true,
    });
    expect(result.canApprove).toBe(true);
  });

  it("blocks re-baseline when no current baseline exists", () => {
    const result = evaluateBudgetApprovalReadiness({
      mode: "REBASELINE",
      versionStatus: "DRAFT",
      baseCurrency: "CHF",
      lines: [
        {
          amountMinor: 200_00,
          financialAccountId: "acc-1",
          financialAccount: { lifecycle: "ACTIVE", canonicalSemantic: "EXPENSE" },
        },
      ],
      currentBaselineExists: false,
    });
    expect(result.canApprove).toBe(false);
    expect(result.issues.some((i) => i.code === "NO_CURRENT_BASELINE_FOR_REBASELINE")).toBe(
      true,
    );
  });
});
