import { describe, expect, it } from "vitest";
import {
  FINANCE_05F_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";

describe("FIN-05F reporting architecture contract", () => {
  it("locks comparative intelligence read model and time-grain safety", () => {
    expect(SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS.comparativeIntelligenceReadModel).toBe(
      "FinanceComparativeIntelligenceReadModel",
    );
    expect(SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing).toBe(true);
    expect(SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS.ytdActualVsAnnualBudgetIsContextNotVariance).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS.reusesFin05bVarianceEngine).toBe(true);
    expect(SCE_FINANCE_REPORTING_05F_ARCHITECTURE_LOCKS.noSecondVarianceEngineInReact).toBe(true);
  });

  it("documents implementation entry points", () => {
    expect(FINANCE_05F_IMPLEMENTATION.workspaceRoute).toBe("/dashboard/finance/reports");
    expect(FINANCE_05F_IMPLEMENTATION.fin05fStatus).toBe("COMPLETE_PO_UAT_PASS");
    expect(FINANCE_05F_IMPLEMENTATION.fin05gStatus).toBe("COMPLETE_PO_UAT_PASS");
  });
});
