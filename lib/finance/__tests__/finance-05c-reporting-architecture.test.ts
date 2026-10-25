import { describe, expect, it } from "vitest";
import {
  FINANCE_05C_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";

describe("FIN-05C reporting architecture contract", () => {
  it("locks Management P&L boundaries", () => {
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.noReactFinancialRecalculation).toBe(true);
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.fin05dFinanceUbersichtNotImplemented).toBe(
      false,
    );
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.fin05eDrilldownNotImplemented).toBe(true);
    expect(SCE_FINANCE_REPORTING_05C_ARCHITECTURE_LOCKS.unassignedResidualDoesNotMutateHierarchy).toBe(
      true,
    );
  });

  it("names canonical read model and route", () => {
    expect(FINANCE_05C_IMPLEMENTATION.managementPnlReadModel).toBe(
      "FinanceManagementPnlReadModel",
    );
    expect(FINANCE_05C_IMPLEMENTATION.queryLoader).toBe("loadFinanceManagementPnlReadModel");
  });
});
