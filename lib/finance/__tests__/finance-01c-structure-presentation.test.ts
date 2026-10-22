import { describe, expect, it } from "vitest";
import {
  FINANCE_STRUCTURE_ACCOUNT_SEMANTICS,
  isFinanceStructureAccountSemantic,
} from "@/lib/finance/structure/structure-presentation";

describe("FIN-01C structure presentation", () => {
  it("exposes only INCOME and EXPENSE for structure builder", () => {
    expect(FINANCE_STRUCTURE_ACCOUNT_SEMANTICS).toEqual(["INCOME", "EXPENSE"]);
  });

  it("rejects balance-sheet semantics for FIN-01C UI boundary", () => {
    expect(isFinanceStructureAccountSemantic("INCOME")).toBe(true);
    expect(isFinanceStructureAccountSemantic("EXPENSE")).toBe(true);
    expect(isFinanceStructureAccountSemantic("ASSET")).toBe(false);
    expect(isFinanceStructureAccountSemantic("LIABILITY")).toBe(false);
    expect(isFinanceStructureAccountSemantic("EQUITY")).toBe(false);
  });
});
