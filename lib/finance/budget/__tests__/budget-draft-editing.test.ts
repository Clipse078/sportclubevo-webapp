import { describe, expect, it } from "vitest";
import {
  budgetTotalsFromDraft,
  buildBudgetDraftAmounts,
  isStaleBudgetSaveResult,
  mergeBudgetDraftAmount,
  shouldAcceptServerBudgetDraft,
} from "@/lib/finance/budget/budget-draft-editing";

const rows = [
  {
    accountId: "income",
    accountName: "Membership",
    reportingGroupName: "G1",
    semantic: "INCOME" as const,
    lifecycle: "ACTIVE" as const,
    lineId: null,
    amountMinor: 1_000_000,
  },
  {
    accountId: "expense",
    accountName: "Staff",
    reportingGroupName: "G1",
    semantic: "EXPENSE" as const,
    lifecycle: "ACTIVE" as const,
    lineId: null,
    amountMinor: 500_000,
  },
];

describe("FIN-01D budget draft editing", () => {
  it("updates local totals immediately from draft state", () => {
    const draft = mergeBudgetDraftAmount(buildBudgetDraftAmounts(rows), "income", 2_000_000);
    const totals = budgetTotalsFromDraft(rows, draft);
    expect(totals.totalIncomeMinor).toBe(2_000_000);
    expect(totals.resultMinor).toBe(1_500_000);
  });

  it("rejects stale async persistence overwriting newer edits", () => {
    const latest = new Map<string, number>([["acc-1", 3]]);
    expect(isStaleBudgetSaveResult("acc-1", 2, latest)).toBe(true);
    expect(isStaleBudgetSaveResult("acc-1", 3, latest)).toBe(false);
  });

  it("blocks server resync while local edits are dirty", () => {
    expect(
      shouldAcceptServerBudgetDraft({
        versionId: "v1",
        syncedVersionId: "v1",
        dirtyAccountIds: new Set(["acc-1"]),
      }),
    ).toBe(false);
    expect(
      shouldAcceptServerBudgetDraft({
        versionId: "v2",
        syncedVersionId: "v1",
        dirtyAccountIds: new Set(["acc-1"]),
      }),
    ).toBe(true);
  });
});
