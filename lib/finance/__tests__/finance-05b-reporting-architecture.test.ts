import { describe, expect, it } from "vitest";
import {
  FINANCE_05B_IMPLEMENTATION,
  SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE } from "@/lib/finance/services/finance-management-reporting-query-service";

describe("FIN-05B reporting architecture contract", () => {
  it("locks presentation-neutral read models and variance centralisation", () => {
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.reportingReadModelsArePresentationNeutral).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.varianceCalculationCentralised).toBe(true);
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.zeroBaselinePercentageIsUnavailable).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.managementResultIsNotStatutoryNetIncome).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.noNPlusOneReportingReadModel).toBe(true);
  });

  it("implements management overview and variance analysis without separate comparative wrapper", () => {
    expect(FINANCE_05B_IMPLEMENTATION.managementOverviewReadModel).toBe(
      "FinanceManagementOverviewReadModel",
    );
    expect(FINANCE_05B_IMPLEMENTATION.varianceAnalysisReadModel).toBe(
      "FinanceVarianceAnalysisReadModel",
    );
    expect(
      SCE_FINANCE_REPORTING_05B_ARCHITECTURE_LOCKS.financeComparativeMeasuresReadModelConsolidatedIntoVarianceAnalysis,
    ).toBe(true);
  });

  it("documents bounded query loads", () => {
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.structureLoads).toBe(4);
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.measureLoads).toBe(3);
  });
});
