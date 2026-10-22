import { describe, expect, it } from "vitest";
import {
  SCE_FINANCE_PRODUCT_LOCKS,
  FINANCE_MONEY_MODEL,
  FCA_REFERENCE_ROLE,
} from "@/lib/finance/finance-architecture";

describe("FIN-01B architecture guardrails", () => {
  it("remains sport and country agnostic", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.sportAgnostic).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.countryAgnosticCore).toBe(true);
    expect(SCE_FINANCE_PRODUCT_LOCKS.swissSpecificFinanceCore).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.footballSpecificFinanceCore).toBe(false);
  });

  it("does not require team, org unit, season, or CHF", () => {
    expect(SCE_FINANCE_PRODUCT_LOCKS.teamRequiredForFinance).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.orgUnitRequiredForFinance).toBe(false);
    expect(SCE_FINANCE_PRODUCT_LOCKS.sportingSeasonRequiredForFinance).toBe(false);
    expect(FINANCE_MONEY_MODEL.hardcodedCurrency).toBe(false);
    expect(FINANCE_MONEY_MODEL.tenantBaseCurrencyConfigurable).toBe(true);
  });

  it("treats FCA as reference only", () => {
    expect(FCA_REFERENCE_ROLE.fcaReferenceIsProductSchema).toBe(false);
  });
});
